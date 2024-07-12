import type * as csstree from 'css-tree';

import {
  ACCEPTED_POSITION_TRY_PROPERTIES,
  type AcceptedPositionTryProperty,
  ANCHOR_SIDES,
  type AnchorSideKeyword,
  type PositionTryOptionsTryTactics,
  type TryBlock,
} from './parse.js';
import {
  generateCSS,
  getAST,
  getCSSPropertyValue,
  INSTANCE_UUID,
  isAnchorFunction,
} from './utils.js';

type InsetAreaProperty =
  | 'left'
  | 'center'
  | 'right'
  | 'span-left'
  | 'span-right'
  | 'x-start'
  | 'x-end'
  | 'span-x-start'
  | 'span-x-end'
  | 'x-self-start'
  | 'x-self-end'
  | 'span-x-self-start'
  | 'span-x-self-end'
  | 'span-all'
  | 'top'
  | 'bottom'
  | 'span-top'
  | 'span-bottom'
  | 'y-start'
  | 'y-end'
  | 'span-y-start'
  | 'span-y-end'
  | 'y-self-start'
  | 'y-self-end'
  | 'span-y-self-start'
  | 'span-y-self-end'
  | 'block-start'
  | 'block-end'
  | 'span-block-start'
  | 'span-block-end'
  | 'inline-start'
  | 'inline-end'
  | 'span-inline-start'
  | 'span-inline-end'
  | 'self-block-start'
  | 'self-block-end'
  | 'span-self-block-start'
  | 'span-self-block-end'
  | 'self-inline-start'
  | 'self-inline-end'
  | 'span-self-inline-start'
  | 'span-self-inline-end'
  | 'start'
  | 'end'
  | 'span-start'
  | 'span-end'
  | 'self-start'
  | 'self-end'
  | 'span-self-start'
  | 'span-self-end';

const INSET_AREA_PROPS: InsetAreaProperty[] = [
  'left',
  'center',
  'right',
  'span-left',
  'span-right',
  'x-start',
  'x-end',
  'span-x-start',
  'span-x-end',
  'x-self-start',
  'x-self-end',
  'span-x-self-start',
  'span-x-self-end',
  'span-all',
  'top',
  'bottom',
  'span-top',
  'span-bottom',
  'y-start',
  'y-end',
  'span-y-start',
  'span-y-end',
  'y-self-start',
  'y-self-end',
  'span-y-self-start',
  'span-y-self-end',
  'block-start',
  'block-end',
  'span-block-start',
  'span-block-end',
  'inline-start',
  'inline-end',
  'span-inline-start',
  'span-inline-end',
  'self-block-start',
  'self-block-end',
  'span-self-block-start',
  'span-self-block-end',
  'self-inline-start',
  'self-inline-end',
  'span-self-inline-start',
  'span-self-inline-end',
  'start',
  'end',
  'span-start',
  'span-end',
  'self-start',
  'self-end',
  'span-self-start',
  'span-self-end',
];
type InsetAreaPropertyChunks =
  | 'left'
  | 'center'
  | 'right'
  | 'span'
  | 'x'
  | 'start'
  | 'end'
  | 'self'
  | 'all'
  | 'top'
  | 'bottom'
  | 'y'
  | 'block'
  | 'inline';

export function isInsetAreaProp(
  property: string | InsetAreaProperty,
): property is InsetAreaProperty {
  return INSET_AREA_PROPS.includes(property as InsetAreaProperty);
}

export function applyTryTactic(
  selector: string,
  tactic: PositionTryOptionsTryTactics,
) {
  // todo: This currently only uses the styles from the first match. Each
  // element may have different styles and need a separate fallback definition.
  const el: HTMLElement | null = document.querySelector(selector);
  if (el) {
    const rules = getExistingInsetRules(el);
    const adjustedRules = applyTryTacticToBlock(rules, tactic);
    return adjustedRules;
  }
}

type InsetRules = Partial<Record<AcceptedPositionTryProperty, string>>;

export function getExistingInsetRules(el: HTMLElement) {
  const rules: InsetRules = {};
  ACCEPTED_POSITION_TRY_PROPERTIES.forEach((prop) => {
    const propVal = getCSSPropertyValue(
      el as HTMLElement,
      `--${prop}-${INSTANCE_UUID}`,
    );
    if (propVal) {
      rules[prop] = propVal;
    }
  });
  return rules;
}

const tryTacticsMapping: Record<
  PositionTryOptionsTryTactics,
  Partial<Record<AcceptedPositionTryProperty, AcceptedPositionTryProperty>>
> = {
  'flip-block': {
    top: 'bottom',
    bottom: 'top',
    'inset-block-start': 'inset-block-end',
    'inset-block-end': 'inset-block-start',
    'margin-top': 'margin-bottom',
    'margin-bottom': 'margin-top',
  },
  'flip-inline': {
    left: 'right',
    right: 'left',
    'inset-inline-start': 'inset-inline-end',
    'inset-inline-end': 'inset-inline-start',
    'margin-left': 'margin-right',
    'margin-right': 'margin-left',
  },
  'flip-start': {},
};

const anchorSideMapping: Record<
  PositionTryOptionsTryTactics,
  Partial<Record<AnchorSideKeyword, AnchorSideKeyword>>
> = {
  'flip-block': {
    top: 'bottom',
    bottom: 'top',
    start: 'end',
    end: 'start',
    'self-end': 'self-start',
    'self-start': 'self-end',
  },
  'flip-inline': {
    left: 'right',
    right: 'left',
    start: 'end',
    end: 'start',
    'self-end': 'self-start',
    'self-start': 'self-end',
  },
  'flip-start': {},
};

const insetAreaPropertyMapping: Record<
  PositionTryOptionsTryTactics,
  Partial<Record<InsetAreaPropertyChunks, InsetAreaPropertyChunks>>
> = {
  'flip-block': {
    top: 'bottom',
    bottom: 'top',
    start: 'end',
    end: 'start',
  },
  'flip-inline': {
    left: 'right',
    right: 'left',
    start: 'end',
    end: 'start',
  },
  'flip-start': {},
};

function mapProperty(
  property: AcceptedPositionTryProperty,
  tactic: PositionTryOptionsTryTactics,
) {
  const mapping = tryTacticsMapping[tactic];
  return mapping[property] || property;
}

function mapAnchorSide(
  side: AnchorSideKeyword,
  tactic: PositionTryOptionsTryTactics,
) {
  const mapping = anchorSideMapping[tactic];
  return mapping[side] || side;
}

function mapInsetArea(
  prop: InsetAreaProperty,
  tactic: PositionTryOptionsTryTactics,
) {
  const mapping = insetAreaPropertyMapping[tactic];
  return prop
    .split('-')
    .map((value) => mapping[value as InsetAreaPropertyChunks] || value)
    .join('-');
}

function mapMargin(
  key: string,
  valueAst: csstree.Value,
  tactic: PositionTryOptionsTryTactics,
) {
  if (key === 'margin') {
    const [first, second, third, fourth] = valueAst.children.toArray();
    if (tactic === 'flip-block') {
      if (fourth) {
        valueAst.children.fromArray([third, second, first, fourth]);
      } else if (third) {
        valueAst.children.fromArray([third, second, first]);
      } // No change needed for 1 or 2 values
    } else if (tactic === 'flip-inline') {
      if (fourth) {
        valueAst.children.fromArray([first, fourth, third, second]);
      } // No change needed for 1, 2 or 3 values
    }
  } else if (key === 'margin-block') {
    const [first, second] = valueAst.children.toArray();
    if (tactic === 'flip-block') {
      if (second) {
        valueAst.children.fromArray([second, first]);
      }
    }
  } else if (key === 'margin-inline') {
    const [first, second] = valueAst.children.toArray();
    if (tactic === 'flip-inline') {
      if (second) {
        valueAst.children.fromArray([second, first]);
      }
    }
  }
}

const getValueAST = (property: string, val: string) => {
  const ast = getAST(`#id{${property}: ${val};}`) as csstree.Block;
  const astDeclaration = (ast.children.first as csstree.Rule)?.block.children
    .first as csstree.Declaration;
  return astDeclaration.value as csstree.Value;
};

export function applyTryTacticToBlock(
  rules: InsetRules,
  tactic: PositionTryOptionsTryTactics,
) {
  const declarations: TryBlock['declarations'] = {};
  Object.entries(rules).forEach(([_key, value]) => {
    const key = _key as AcceptedPositionTryProperty;
    const valueAst = getValueAST(key, value);

    const newKey = mapProperty(key as AcceptedPositionTryProperty, tactic);

    // If we're changing the property, revert the original if it hasn't been set.
    if (newKey !== key) {
      declarations[key] ??= 'revert';
    }

    if (isAnchorFunction(valueAst.children.first)) {
      valueAst.children.first.children.map((item) => {
        if (
          item.type === 'Identifier' &&
          ANCHOR_SIDES.includes(item.name as AnchorSideKeyword)
        ) {
          item.name = mapAnchorSide(item.name as AnchorSideKeyword, tactic);
        }
      });
    }

    if (key === 'inset-area') {
      valueAst.children.map((id) => {
        if (id.type === 'Identifier' && isInsetAreaProp(id.name)) {
          id.name = mapInsetArea(id.name, tactic);
        }
        return id;
      });
    }
    if (key.startsWith('margin')) {
      mapMargin(key, valueAst, tactic);
    }

    declarations[newKey] = generateCSS(valueAst);
  });
  return declarations;
}
