/**
 * One page whose content each test supplies: a real App, mounted as a real site, so a piece is
 * rendered by the real renderer, gets a real `this.mount` / `this.on`, and is pressed through CDP.
 */

import {
    App, mountSite, needs, Router, View,
    type Dom, type MountedApp, type Node, type SurfaceOptions,
} from '@flybyme/mesh-web';
import '../src/charts.css';

export function makeDom(): Dom {
    const make = (options: SurfaceOptions): Node => {
        const props: Record<string, unknown> = {};
        if (options.props !== undefined) Object.assign(props, options.props);
        if (options.style !== undefined) props['style'] = options.style;
        if (options.class !== undefined) props['class'] = options.class;
        return {
            kind: 'surface',
            setup(host: unknown): (() => void) | void {
                if (host instanceof HTMLElement) {
                    return options.setup(host);
                }
            },
            props,
            key: options.key,
        };
    };
    return {
        Surface: make,
        surface: make,
    };
}

type Body = (host: Page) => Node;
let body: Body = () => [];

export class Page extends View({ needs: needs('dom'), inject: { router: Router } }) {
    render(): Node {
        return body(this);
    }
}

class ChartsTest extends App({ needs: needs('dom'), routes: { '/': Page } }) {}

let site: MountedApp | undefined;
let root: HTMLElement | undefined;

/** Mount a page showing `render(host)`. The previous one, if any, is disposed first. */
export function show(render: Body): HTMLElement {
    unmount();
    body = render;
    history.replaceState(null, '', '/');
    root = document.createElement('div');
    document.body.appendChild(root);
    site = mountSite(ChartsTest, {
        root,
        granted: {
            dom: makeDom(),
        },
    });
    return root;
}

export function unmount(): void {
    site?.dispose();
    site = undefined;
    root?.remove();
    root = undefined;
}

export const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

export function byText<E extends Element = HTMLElement>(scope: ParentNode, selector: string, text: string): E {
    const found = [...scope.querySelectorAll<E>(selector)].find((el) => el.textContent === text);
    if (found === undefined) throw new Error(`no ${selector} with text "${text}"`);
    return found;
}
