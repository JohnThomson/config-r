import { css, SerializedStyles } from '@emotion/react';
import * as React from 'react';
import { useState, ReactElement, ReactNode } from 'react';

import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import toPath from 'lodash/toPath';

import { Field, Formik, useField, useFormikContext } from 'formik';
import {
  Typography,
  Paper,
  List,
  Divider,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button,
  ListItemButton,
  MenuItem,
  Tooltip,
  useRadioGroup,
  ToggleButton,
  InputAdornment,
} from '@mui/material';
import {
  TextField,
  Switch,
  Checkbox,
  Select as FormikMuiSelect,
  ToggleButtonGroup,
} from 'formik-mui';
import { HighlightSearchTerms } from './HighlightSearchTerms';
import { FilterForSearchText } from './FilterForSearch';
import { SearchContext } from './SearchContextProvider';

type valueGetter = () => Object;

const disabledGrey = 'rgba(5, 1, 1, 0.26)';
const secondaryGrey = 'rgba(0, 0, 0, 0.54)';

const FocusPageContext = React.createContext({
  focussedSubPagePath: '',
  setFocussedSubPagePath: (p: string) => {},
});

export const ContentPane: React.FunctionComponent<
  React.PropsWithChildren<{
    // this is the whole settings object that we are editing
    initialValues: object;
    currentGroupIndex?: number;
    children:
      | React.ReactElement<typeof ConfigrGroup>
      | React.ReactElement<typeof ConfigrGroup>[];
    setValueGetter?: (vg: valueGetter) => void;
    setValueOnRender?: (currentValues: any) => void;
  }>
> = (props) => {
  // We allow a single level of nesting (see ConfigrSubPage), that is all that is found in Chrome Settings.
  // A stack would be easy but it would put some strain on the UI to help the user not be lost.
  const [focussedSubPagePath, setFocussedSubPagePath] = useState('');

  const valuesToReportRef = React.useRef(props.initialValues);

  const valuesToReportJsonRef = React.useRef(JSON.stringify(props.initialValues));

  const setValueOnRenderWrapper = (newValues: any) => {
    if (!props.setValueOnRender) return;

    let valueToReport = newValues;
    if (valueToReport[kDisabledValuePrefix]) {
      // A shallow clone is enough, we just want to NOT remove kDisabledValuePrefix from the
      // current values. But we DO want to remove it from the values we report!
      valueToReport = { ...valueToReport };
      delete valueToReport[kDisabledValuePrefix];
    }
    const newStringValues = JSON.stringify(valueToReport);
    // It's very important that we don't call setValueOnRender with a new cloned
    // object each time, or we're likely to get into an infinite loop of re-renders,
    // as some parent re-renders this whole component when its settings state changes.
    // So we use the two ref objects to make sure we pass the same instance each time
    // unless the JSON has changed.
    // This also allows us to avoid calling setValueOnRender at all if nothing has changed.
    // Review: is it a good thing to not call setValueOnRender if nothing has changed?
    // If so, is there a better name for this function, now it is NOT called on every render?
    // Maybe just onChange?
    if (newStringValues === valuesToReportJsonRef.current) return;
    valuesToReportJsonRef.current = newStringValues;
    valuesToReportRef.current = valueToReport;
    props.setValueOnRender(valuesToReportRef.current);
  };

  return (
    <FocusPageContext.Provider
      value={{
        focussedSubPagePath: focussedSubPagePath,
        setFocussedSubPagePath: setFocussedSubPagePath,
      }}
    >
      <Formik initialValues={props.initialValues} onSubmit={(values) => {}}>
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          handleSubmit,
          isSubmitting,
        }) => {
          if (props.setValueGetter)
            props.setValueGetter(() => {
              return values;
            });

          setValueOnRenderWrapper(values);

          return (
            <form
              onSubmit={handleSubmit}
              css={css`
                flex-grow: 1;
              `}
            >
              <VisibleGroups
                currentGroup={props.currentGroupIndex}
                focussedSubPagePath={focussedSubPagePath}
              >
                {props.children}
              </VisibleGroups>
            </form>
          );
        }}
      </Formik>
    </FocusPageContext.Provider>
  );
};

const VisibleGroups: React.FunctionComponent<
  React.PropsWithChildren<{
    currentGroup?: number;
    focussedSubPagePath?: string;
    children:
      | React.ReactElement<typeof ConfigrGroup>
      | React.ReactElement<typeof ConfigrGroup>[];
  }>
> = (props) => {
  return (
    <SearchContext.Consumer>
      {({ searchString }) => {
        return (
          <div
            id="groups"
            css={css`
              //overflow-y: scroll; //allows us to scroll the groups without
              //scrolling the heading tabs
              overflow-y: auto;
            `}
          >
            {searchString ? (
              <HighlightSearchTerms
                searchString={searchString}
                focussedSubPagePath={props.focussedSubPagePath}
              >
                {props.children}
              </HighlightSearchTerms>
            ) : (
              React.Children.toArray(props.children).filter(
                (c: React.ReactNode, index: number) => index === props.currentGroup,
              )
            )}
          </div>
        );
      }}
    </SearchContext.Consumer>
  );
};

export const ConfigrGroup: React.FunctionComponent<
  React.PropsWithChildren<{
    label: string;
    description?: string | React.ReactNode;
    // use hasSubgroups when this contains ConfigrSubGroups that provide their own background
    level?: undefined | 1 | 2;
  }>
> = (props) => {
  return (
    <FilterForSearchText {...props} kids={props.children}>
      <div
        className="indentIfInSubPage"
        css={css`
          //margin-top: 21px !important;
          margin-bottom: 12px !important;
        `}
      >
        <Typography variant={props.level === 2 ? 'h3' : 'h2'}>{props.label}</Typography>
        <Typography variant={'caption'}>{props.description}</Typography>
      </div>
      {props.level === 1 ? (
        <div className="indentIfInSubPage">{props.children}</div>
      ) : (
        <PaperGroup>{props.children}</PaperGroup>
      )}
    </FilterForSearchText>
  );
};

const PaperGroup: React.FunctionComponent<
  React.PropsWithChildren<{
    label?: string;
  }>
> = (props) => {
  const childrenWithStore = getChildrenWithStore(props);
  return (
    <Paper
      className="indentIfInSubPage"
      elevation={2}
      css={css`
        //width: 100%; doesn't work with shadow
        margin-left: 2px; //needed to show shadow
        margin-right: 2px; //needed to show shadow
        margin-bottom: 12px !important;
      `}
    >
      <List
        component="nav"
        css={css`
          width: calc(100% - 20px);
        `}
      >
        <FilterAndJoinWithDividers>{childrenWithStore}</FilterAndJoinWithDividers>
      </List>
    </Paper>
  );
};
function getChildrenWithStore(props: React.PropsWithChildren<{}>) {
  return React.Children.map(props.children, (c, index) => {
    if (React.isValidElement(c)) {
      return React.cloneElement(c, {
        ...c.props,
      });
    } else return null;
  });
}

// For each child element, determine if we want it to be visible right now,
// and if we want to stick a horizontal divider beneath it.
const FilterAndJoinWithDividers: React.FunctionComponent<React.PropsWithChildren<{}>> = (
  props,
) => {
  const count = React.Children.toArray(props.children).length;
  return props.children
    ? React.Children.toArray(props.children).reduce(
        (result: any, child: React.ReactNode, index: number) => {
          if (!React.isValidElement(child)) {
            throw Error('We only expect to be given full elements not, e.g., strings');
          }
          const childElement = child as ReactElement;
          const wrappedForFiltering = (
            <FilterForSubPage {...childElement.props} key={'filter' + index}>
              {childElement}
              {index < count - 1 && <Divider component="li" key={index} />}
            </FilterForSubPage>
          );
          return result.concat(wrappedForFiltering);
        },
        [],
      )
    : null;
};

const ConfigrRowOneColumn: React.FunctionComponent<
  React.PropsWithChildren<{
    label: string;
    description?: string | React.ReactNode;
    control: React.ReactNode;
  }>
> = (props) => {
  return (
    <ListItem
      //className={'MuiListItem-alignItemsFlexStart'}
      css={css`
        flex-direction: column;
        // I don't understand why this is needed. Else, it's centered
        align-items: flex-start;
      `}
    >
      <ListItemText
        primaryTypographyProps={{ variant: 'h4' }}
        primary={props.label}
        secondary={props.description}
      />
      {props.control}
    </ListItem>
  );
};

// If a subPage is in effect, only render if we are part of it
const FilterForSubPage: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
  }>
> = (props) => {
  return (
    <FocusPageContext.Consumer>
      {({ focussedSubPagePath }) => {
        if (focussedSubPagePath)
          if (
            !(
              (
                props.path === focussedSubPagePath ||
                isParent(props.path, focussedSubPagePath) || // we are a parent of the focused thing
                isParent(focussedSubPagePath, props.path)
              ) // we are a child of the focused thing
            )
          )
            return null;
        return <React.Fragment>{props.children}</React.Fragment>;
      }}
    </FocusPageContext.Consumer>
  );
};

type StringEditorComponent = React.FunctionComponent<{
  value: string;
  onChange: (value: string) => void;
}>;
type BooleanEditorComponent = React.FunctionComponent<{
  value: boolean;
  onChange: (value: boolean) => void;
}>;

const ConfigrRowTwoColumns: React.FunctionComponent<
  React.PropsWithChildren<{
    label: string;
    labelCss?: SerializedStyles;
    path: string;
    description?: string;
    control: React.ReactElement;
    disabled?: boolean;
    height?: string;
    indented?: boolean;
    onClick?: () => void;
  }>
> = (props) => {
  const inner = (
    <SearchContext.Consumer>
      {({ searchRegEx }) => {
        const row = (
          <div
            css={css`
              display: flex;
              flex-direction: column;
              width: 100%;
            `}
          >
            {/* Left side */}
            <ListItemText
              primaryTypographyProps={{ variant: 'h4' }}
              title={props.path}
              css={css`
                color: ${props.disabled ? disabledGrey : 'unset'};
                ${props.height ? 'height:' + props.height : ''}
                ${props.indented && 'margin-left: 30px;'}
                user-select: none;
                * {
                  ${props.labelCss}
                }
              `}
              primary={props.label}
            />
            {/* Right side */}
            <ListItemSecondaryAction
              css={css`
                // OK, this feels like a hack. But the MUI default puts it at
                // top:50% which is fine until you have a secondary label, in
                // which case the whole thing gets very tall but really the
                // button should be top-aligned.
                /// Months later.. but it messed up toggleGroups and I'm not seeing the problem it was solving, at the moment.
                //top: 22px;
              `}
            >
              {props.control}
            </ListItemSecondaryAction>
            <Typography
              variant="caption"
              // enhance: the default component, span, ignores the line-height of our caption
              // but if we use p, we get a console error because the parent is already a p.body2
              //component={'p'}
              css={css`
                &,
                * {
                  // this is a hack... we need to figured out how to have this MUI List stuff allow a text along the bottom
                  max-width: calc(100% - 200px);
                  color: ${props.disabled ? disabledGrey : 'unset'};
                }
              `}
            >
              {props.description}
            </Typography>
          </div>
        );
        if (searchRegEx) {
          const count = React.Children.toArray(props.children).filter((c) =>
            searchRegEx.exec((c as any).props.label as string),
          ).length;
          if (count) {
            return (
              // I haven't managed to get this work yet
              // <Tooltip open={true} title="hello">
              //   {row}
              // </Tooltip>
              <div>
                {row}
                <span
                  css={css`
                    background-color: yellow;
                  `}
                >
                  {`${count} matches`}
                </span>
              </div>
            );
          }
        }
        return row;
      }}
    </SearchContext.Consumer>
  );
  return props.onClick ? (
    <ListItemButton onClick={props.onClick}>{inner}</ListItemButton>
  ) : (
    <ListItem
      css={css`
        height: ${props.height};
      `}
    >
      {inner}
    </ListItem>
  );
};

// function getCheckedStateProps(props: any) {
//   return {
//     checked: props.store!.useState(props.get),
//     onChange: (e: any) =>
//       props.store!.update((s: any) => props.set(s, e.target.checked)),
//   };
// }
// function getStringStateProps(props: any) {
//   return {
//     value: props.store!.useState(props.get),
//     error: props.store!.useState(
//       props.getErrorMessage ?? ((s: any) => undefined)
//     ),
//     helperText: props.store!.useState(
//       props.getErrorMessage ?? ((s: any) => undefined)
//     ),
//     onChange: (e: any) =>
//       props.store!.update((s: any) => props.set(s, e.target.value)),
//   };
// }
export const ConfigrInput: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    className?: string;
    type?: 'text' | 'number' | 'email'; // I don't really know what all the options are in formik
    units?: string;
    description?: string;
    disabled?: boolean;
    getErrorMessage?: (data: any) => string | undefined;
  }>
> = (props) => {
  return (
    <ConfigrRowTwoColumns
      {...props}
      control={
        <Field
          component={TextField}
          variant="standard"
          name={props.path}
          type={props.type ?? 'text'}
          InputProps={
            props.units
              ? {
                  endAdornment: (
                    <InputAdornment position="end">{props.units}</InputAdornment>
                  ),
                }
              : undefined
          }
          css={css`
            input {
              text-align: end;
            }
          `}
          //className={props.className}
        />
      }
    ></ConfigrRowTwoColumns>
  );
};

// Clients can use this to create their own custom inputs based on string data.
// For example, <DefaultColorPicker> or some other color picker.
export const ConfigrCustomStringInput: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    disabled?: boolean;
    description?: string;
    // control: React.ComponentType<
    //   React.PropsWithChildren<{ value: string; onChange: (value: string) => void }>
    // >;
    // control: React.ReactElement<
    //   React.PropsWithChildren<{ value: string; onChange: (value: string) => void }>
    // >;
    //control: (value: string, onChange: (x: string) => void) => ReactElement;
    control: React.FunctionComponent<{
      value: string;
      disabled?: boolean;
      onChange: (value: string) => void;
    }>;
    getErrorMessage?: (data: any) => string | undefined;
  }>
> = (props) => {
  const [field, meta, helpers] = useField(props.path);
  const { value } = meta;
  const { setValue } = helpers;

  return (
    <ConfigrRowTwoColumns
      {...props}
      control={
        <props.control disabled={props.disabled} value={value} onChange={setValue} />
      }
    ></ConfigrRowTwoColumns>
  );
};

// Clients can use this to create their own custom inputs based on boolean data.
// Note, this is untested, but based on ConfigrCustomStringInput which is tested.
export const ConfigrCustomBooleanInput: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    control: BooleanEditorComponent;
    description?: string;
    disabled?: boolean;
    getErrorMessage?: (data: any) => string | undefined;
  }>
> = (props) => {
  const [field, meta, helpers] = useField(props.path);
  const { value } = meta;
  const { setValue } = helpers;

  return (
    <ConfigrRowTwoColumns
      {...props}
      control={<props.control value={value} onChange={setValue} />}
    ></ConfigrRowTwoColumns>
  );
};

// Clients can use this to create their own custom inputs based on number data.
// Note, this is untested, but based on ConfigrCustomStringInput which is tested.
export const ConfigrCustomNumberInput: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    control: React.FunctionComponent<
      React.PropsWithChildren<{ value: number; onChange: (value: number) => void }>
    >;
    description?: string;
    disabled?: boolean;
    getErrorMessage?: (data: any) => string | undefined;
  }>
> = (props) => {
  const [field, meta, helpers] = useField(props.path);
  const { value } = meta;
  const { setValue } = helpers;

  return (
    <ConfigrRowTwoColumns
      {...props}
      control={<props.control value={value} onChange={setValue} />}
    ></ConfigrRowTwoColumns>
  );
};

// Clients can use this to create their own custom inputs based on object data.
// Note, this is untested, but based on ConfigrCustomStringInput which is tested.
export function ConfigrCustomObjectInput<T>(
  props: React.PropsWithChildren<{
    path: string;
    label: string;
    description?: string;
    disabled?: boolean;
    control: React.FunctionComponent<
      React.PropsWithChildren<{ value: T; onChange: (value: T) => void }>
    >;
    getErrorMessage?: (data: any) => string | undefined;
  }>,
) {
  const [field, meta, helpers] = useField(props.path);
  const { value } = meta;
  const { setValue } = helpers;

  return (
    <ConfigrRowTwoColumns
      {...props}
      control={<props.control value={value} onChange={setValue} />}
    ></ConfigrRowTwoColumns>
  );
}

export const ConfigrSelect: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    indented?: boolean;
    disabled?: boolean;
    options: Array<{ value: string; label?: string; description?: string } | number>;
    enableWhen?: string | ((currentValues: object) => boolean);
    description?: string;
    getErrorMessage?: (data: any) => string | undefined;
  }>
> = (props) => {
  const disabled = props.disabled || !useBooleanBasedOnValues(true, props.enableWhen);
  return (
    <ConfigrRowTwoColumns
      {...props}
      disabled={disabled}
      control={
        <Field
          name={props.path}
          disabled={disabled}
          component={FormikMuiSelect}
          sx={{ minWidth: 180 }}
          css={css`
            .MuiSelect-select {
              padding: 3px !important;
              padding-left: 9px !important;
              background-color: #f1f1f1;
            }
            * {
              border-style: none;
            }
          `}
        >
          {/* Allow a list of numbers (typically font sizes) instead of label/value objects */}
          {props.options.map((o) => {
            if (typeof o === 'number') {
              return (
                <MenuItem value={o} key={o}>
                  <span>{o}</span>
                </MenuItem>
              );
            }
            const labelToUse = o.label ?? o.value;
            const valueToUse = o.value ?? o.label;
            return (
              <MenuItem value={valueToUse} key={labelToUse}>
                {o.description ? (
                  <Tooltip title={o.description}>
                    <span>{labelToUse}</span>
                  </Tooltip>
                ) : (
                  <span>{labelToUse}</span>
                )}
              </MenuItem>
            );
          })}
        </Field>
      }
    ></ConfigrRowTwoColumns>
  );
};

export const ConfigrSubgroup: React.FunctionComponent<
  React.PropsWithChildren<{
    label: string;
    path: string;
    description?: string | React.ReactNode;
    getErrorMessage?: (data: any) => string | undefined;
  }>
> = (props) => {
  return (
    <FilterForSubPage {...props}>
      <ConfigrGroup {...props} level={2}>
        {props.children}
      </ConfigrGroup>
    </FilterForSubPage>
  );
};

// In Chrome Settings, most controls live under pages that you get
// to by clicking on a right-facing triangle control. When clicked,
// the whole settings area switches to that of the page, and a back
// button, labeled with the name of the page, is shown at the top.
// We only allow a single level of nesting.
export const ConfigrSubPage: React.FunctionComponent<
  React.PropsWithChildren<{
    label: string;
    labelCss?: SerializedStyles;
    path: string;
    getErrorMessage?: (data: any) => string | undefined;
  }>
> = (props) => {
  return (
    <FocusPageContext.Consumer>
      {({ focussedSubPagePath, setFocussedSubPagePath }) => {
        if (focussedSubPagePath === props.path) {
          return (
            <React.Fragment>
              <div css={props.labelCss}>
                <IconButton onClick={() => setFocussedSubPagePath('')}>
                  <ArrowBackIcon />
                </IconButton>
                {props.label}
              </div>
              <div
                css={css`
                  .indentIfInSubPage {
                    margin-left: 20px;
                    //margin-right: 20px;
                  }
                `}
              >
                <FilterAndJoinWithDividers>{props.children}</FilterAndJoinWithDividers>
              </div>
            </React.Fragment>
          );
        }
        // We are not the focussed page, so show a row with a button that would make
        // us the focussed page
        else
          return (
            <ConfigrRowTwoColumns
              onClick={() => setFocussedSubPagePath(props.path)}
              control={<ArrowRightIcon />}
              {...props}
            />
          );
      }}
    </FocusPageContext.Consumer>
  );
};

// Used to display the child component for each member of an array
// Note, this `render` function leaves it to you to take the index and build
// out the full path. I originally set out to instead just take some children elements
// and then render them using relative paths. I figured out how to do it this way sooner,
// is probably possible with a bunch of cloning so that the path prop could be changed
// to the full path that formik requires. E.g. path="./iso" could be changed to path="project.languages[0].iso"
export const ConfigrForEach: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string; // really, `path`
    searchTerms: string;
    render: (pathPrefix: string, index: number) => React.ReactNode;
    getErrorMessage?: (data: any) => string | undefined;
  }>
> = (props) => {
  const { values } = useFormikContext();
  const items = getFormValueFromPath(values, props.path);
  return (
    <React.Fragment>
      {items.map((_item: any, index: number) =>
        props.render(`${props.path}[${index}]`, index),
      )}
    </React.Fragment>
  );
};

export const kDisabledValuePrefix = 'disabledValue$';

export const ConfigrBoolean: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    disabled?: boolean;
    description?: string;
    immediateEffect?: boolean;
    // If disabledValue is set, then the checkbox is disabled, and the checkbox is checked
    // or not based on disabledValue rather then the value indicated by the path.
    // The value in the main settings object is not affected and may be different from
    // the value determined by disabledValue and shown in the checkbox.
    // This does not work when immediateEffect is true, and should always be undefined in that case.
    disabledValue?: boolean;
  }>
> = (props) => {
  const { path, disabled, disabledValue, ...propsToPass } = props;
  const { values } = useFormikContext();
  let actualPath = path;
  if (props.disabledValue !== undefined) {
    let disabledValues = (values as any)[kDisabledValuePrefix];
    if (!disabledValues) {
      disabledValues = {};
      (values as any)[kDisabledValuePrefix] = disabledValues;
    }
    // Something elsewhere in configr treats dot and square brackets specially,
    // as paths into child objects and arrays. If we leave them in, then the
    // code won't find a disabledValue that just uses the whole path as a prop name.
    // So we replace them with underscores.
    const disabledPath = actualPath
      .replace(/\./g, '_')
      .replace(/\[/g, '_')
      .replace(/\]/g, '_');
    // Review: this is a somewhat naughty thing to do. We're modifying an object
    // that is part of the formik state. But the thing we're adding is unlikely
    // to be noticed by any other code, and it works.
    // If we decide this is unacceptable, the only other idea I've had is to pass
    // a list of disabledValue paths to the ContentPane, and have it modify the
    // initialValues object before passing it to Formik.
    disabledValues[disabledPath] = props.disabledValue;
    actualPath = kDisabledValuePrefix + '.' + disabledPath;
  }

  // I don't think this is useful when we are using disabledValue and actualPath
  // is different from props.path. But the rules of hooks won't let us NOT define
  // it conditionally, and I think it's safer to point it at the phony field than
  // the real one we definitely don't want to modify.
  const [field, meta, helpers] = useField(actualPath);

  // we're not supporting indeterminate state here (yet), so treat an undefined value as false
  // (but don't change anything if disabledValue is set)
  if (
    props.disabledValue === undefined &&
    (field.value === undefined || field.value === null)
  ) {
    // get a console error if we make this change while rendering
    window.setTimeout(() => helpers.setValue(false), 0);
  }
  const reallyDisabled = props.disabled || props.disabledValue !== undefined;
  const control = props.immediateEffect ? (
    // Review: this branch doesn't seem to support disabled, so maybe shouldn't
    // support disabledValue either?
    <Field component={Switch} type="checkbox" name={props.path} label={props.label} />
  ) : (
    <Field
      component={Checkbox}
      type="checkbox"
      disabled={reallyDisabled}
      name={actualPath}
      label={props.label}
    />
  );

  return (
    <ConfigrRowTwoColumns
      // clicking the row is the same as clicking the toggle control
      onClick={() => {
        // I have no idea why this is needed. But without it, clicking the row
        // toggles the value even when disabled.
        if (reallyDisabled) return;
        helpers.setValue(!field.value);
      }}
      control={control}
      {...propsToPass}
      disabled={reallyDisabled}
      path={actualPath}
    />
  );
};

export const ConfigrRadioGroup: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    description?: string;
    disabled?: boolean;
    row?: boolean;
  }>
> = (props) => {
  return (
    // I could imagine wanting the radio buttons in the right column. There aren't any examples of this in chrome:settings.
    // Note that normally in chrome:settings, radios are the sole child of an entire group (e.g. "on startup", "cookie settings",
    // "safe browsing"). When the choices are short and don't need explanation, then a combobox is used instead (e.g. "Search engine")
    // But to do that, we'll have to fix some css problems (e.g. the radio doesn't know its width and so doesn't line up properly
    // on its left edge.)
    <ConfigrRowOneColumn
      {...props}
      control={<ConfigrRadioGroupRaw {...props} />}
    ></ConfigrRowOneColumn>
  );
};
export const ConfigrRadioGroupRaw: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    row?: boolean;
    description?: string;
    disabled?: boolean;
  }>
> = (props) => {
  const [field] = useField(props.path); // REVIEW: what are we using out of `field` in the RadioGroup below? Probably onchange, value
  console.log('radiogroup field ' + JSON.stringify(field));
  return (
    <RadioGroup row={props.row} {...field} {...props}>
      {props.children}
    </RadioGroup>
  );
};

export const ConfigrRadio: React.FunctionComponent<
  React.PropsWithChildren<{
    value: any;
    label?: string; // either include a label or a single child
  }>
> = (props) => {
  const radioContext = useRadioGroup();
  console.log('useRadioGroup ' + JSON.stringify(radioContext));
  if (props.label) {
    return (
      <FormControlLabel value={props.value} control={<Radio />} label={props.label} />
    );
  } else {
    return <React.Fragment>{props.children}</React.Fragment>;
  }
};

export const ConfigrToggleGroup: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    row?: boolean;
    height?: string;
    description?: string;
    disabled?: boolean;
  }>
> = (props) => {
  return (
    <ConfigrRowTwoColumns
      {...props}
      control={<ConfigrToggleGroupRaw {...props} />}
    ></ConfigrRowTwoColumns>
  );
};
export const ConfigrToggleGroupRaw: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    row?: boolean;
    height?: string;
    description?: string;
    disabled?: boolean;
  }>
> = (props) => {
  return (
    <Field component={ToggleButtonGroup} name={props.path} type="checkbox" exclusive>
      {props.children}
    </Field>
  );
};

// This cannot be a React.FunctionComponent because then the ToggleGroup stops working.
// So we have to transparently just return the ToggleButton
export function ConfigrMakeToggle(value: any, content: ReactNode) {
  return <ToggleButton value={value}>{content}</ToggleButton>;
}

// Use for things like a file or folder chooser.
export const ConfigrChooserButton: React.FunctionComponent<
  React.PropsWithChildren<{
    path: string;
    label: string;
    description?: string;
    buttonLabel: string;
    chooseAction: (currentValue: string) => string;
    disabled?: boolean;
  }>
> = (props) => {
  const { setFieldValue } = useFormikContext();
  const [field] = useField(props.path);

  return (
    <ConfigrRowTwoColumns
      {...props}
      height="50px"
      control={
        <div
          css={css`
            height: 56px; // leave room to show the path below the button
          `}
        >
          <Button
            disabled={props.disabled}
            variant={'outlined'}
            onClick={() => {
              const newValue = props.chooseAction(field.value);
              setFieldValue(props.path, newValue);
            }}
          >
            {props.buttonLabel}
          </Button>

          <div
            css={css`
              color: ${secondaryGrey};
            `}
          >
            {field.value}
          </div>
        </div>
      }
    ></ConfigrRowTwoColumns>
  );
};

// set visibility or enabled state based on provided predicates
export const ConfigrConditional: React.FunctionComponent<
  React.PropsWithChildren<{
    enableWhen?: (currentValues: object) => boolean;
    visibleWhen?: (currentValues: object) => boolean;
  }>
> = (props) => {
  const { values } = useFormikContext<object>();
  const disabled = props.enableWhen ? !props.enableWhen(values) : false;
  const visible = props.visibleWhen ? props.visibleWhen(values) : true;
  if (!visible) return null;
  return (
    <React.Fragment>
      {React.Children.map(
        props.children as React.ReactElement<{ disabled: boolean }>[],
        (child: React.ReactElement<{ disabled: boolean }>) => {
          if (React.isValidElement(child)) {
            // clone in order to inject this disabled prop. It's up to the child
            // to support that prop.
            return React.cloneElement(child, { disabled: disabled });
          } else return child;
        },
      )}
    </React.Fragment>
  );
};

/**
 * Deeply get a value from an object via its path.
 */
function getFormValueFromPath(
  obj: any,
  key: string | string[],
  def?: any,
  p: number = 0,
) {
  const path = toPath(key); // formik uses this method from lodash
  while (obj && p < path.length) {
    obj = obj[path[p++]];
  }
  return obj === undefined ? def : obj;
}

function useBooleanBasedOnValues(
  defaultResult: boolean,
  functionOrPath?: ((currentValues: object) => boolean) | string,
): boolean {
  const { values } = useFormikContext<object>();
  if (!functionOrPath) return defaultResult;
  if (typeof functionOrPath === 'string') {
    return getFormValueFromPath(values, functionOrPath) === true;
  } else {
    return functionOrPath(values);
  }
}

function isParent(parentPath: string, childPath: string): boolean {
  // yes: start.font, start.font.feature
  // no: start.font, start.fontfeature
  return childPath.startsWith(parentPath + '.');
}
