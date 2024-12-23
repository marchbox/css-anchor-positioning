import * as csstree from 'css-tree';
import { nanoid } from 'nanoid/non-secure';

import type { Selector } from './dom.js';

export const INSTANCE_UUID = nanoid();

// https://github.com/import-js/eslint-plugin-import/issues/3019
// eslint-disable-next-line import/namespace
export interface DeclarationWithValue extends csstree.Declaration {
  value: csstree.Value;
}

export function isAnchorFunction(
  node: csstree.CssNode | null,
): node is csstree.FunctionNode {
  return Boolean(node && node.type === 'Function' && node.name === 'anchor');
}

export function getAST(cssText: string) {
  return csstree.parse(cssText, {
    parseAtrulePrelude: false,
    parseCustomProperty: true,
  });
}

export function generateCSS(ast: csstree.CssNode) {
  return csstree.generate(ast, {
    // Default `safe` adds extra (potentially breaking) spaces for compatibility
    // with old browsers.
    mode: 'spec',
  });
}

export function isDeclaration(
  node: csstree.CssNode,
): node is DeclarationWithValue {
  return node.type === 'Declaration';
}

export function getDeclarationValue(node: DeclarationWithValue) {
  return (node.value.children.first as csstree.Identifier).name;
}

export interface StyleData {
  el: HTMLElement;
  css: string;
  url?: URL;
  changed?: boolean;
}

export const POSITION_ANCHOR_PROPERTY = `--position-anchor-${INSTANCE_UUID}`;

export function splitCommaList(list: csstree.List<csstree.CssNode>) {
  return list.toArray().reduce(
    (acc: csstree.Identifier[][], child) => {
      if (child.type === 'Operator' && child.value === ',') {
        acc.push([]);
        return acc;
      }
      if (child.type === 'Identifier') {
        acc[acc.length - 1].push(child);
      }

      return acc;
    },
    [[]],
  );
}

export function getSelectors(rule: csstree.SelectorList | undefined) {
  if (!rule) return [];

  return (rule.children as csstree.List<csstree.Selector>)
    .map((selector) => {
      let pseudoElementPart: string | undefined;

      if (selector.children.last?.type === 'PseudoElementSelector') {
        selector = csstree.clone(selector) as csstree.Selector;
        pseudoElementPart = generateCSS(selector.children.last!);
        selector.children.pop();
      }

      const elementPart = generateCSS(selector);

      return {
        selector: elementPart + (pseudoElementPart ?? ''),
        elementPart,
        pseudoElementPart,
      } satisfies Selector;
    })
    .toArray();
}
