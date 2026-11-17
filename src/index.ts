/**
 * Afterglow UI — public entry.
 *
 *   import { toast, bindDialog, enhanceSelects } from "afterglow-ui";
 *   import "afterglow-ui/style.css";
 */
import "./styles/afterglow.css";

// core
export { signal, computed, effect, bind, untracked, onCleanup, flushEffects } from "./core/signal";
export type { Signal, ReadonlySignal, Computed, Dispose } from "./core/signal";
export { KeyedList, lisIndices } from "./core/keyed";
export type { Key, KeyedOptions } from "./core/keyed";
export { springEasing, springs } from "./core/spring";
export type { SpringOptions, SpringEasing } from "./core/spring";
export { frameThrottle, nextFrame, onFrame, prefersReducedMotion, animationEnd } from "./core/raf";
export { el, append, qs, qsa, setText, delegate, once } from "./core/dom";
export { icon, iconEl, iconNames } from "./core/icons";
export type { IconName, IconOptions } from "./core/icons";
export { applyTheme, applyBrand, applyDensity, resolveTheme } from "./core/theme";
export type { ThemeName, BrandName, Density } from "./core/theme";

// components
export { toast, dismissAllToasts } from "./components/toast";
export type { ToastOptions, ToastTone, ToastAction } from "./components/toast";
export { openDialog, closeDialog, bindDialog, confirmDialog, dialogCloseButton } from "./components/dialog";
export type { DialogBindingOptions, DialogController, ConfirmOptions } from "./components/dialog";
export { openPopover, closePopover, togglePopover, isPopoverOpen, positionPopover } from "./components/popover";
export type { PopoverOptions, Placement } from "./components/popover";
export { menu, initMenus } from "./components/menu";
export type { MenuOptions, MenuController } from "./components/menu";
export { tabs, initTabs } from "./components/tabs";
export type { TabsOptions, TabsController } from "./components/tabs";
export { segmented, initSegmented } from "./components/segmented";
export type { SegmentedOptions, SegmentedController } from "./components/segmented";
export { enhanceSelect, enhanceSelects } from "./components/select";
export { enhanceRange, enhanceRanges } from "./components/slider";
export type { SliderOptions, SliderController } from "./components/slider";
export { initTooltips } from "./components/tooltip";
export { VirtualList } from "./components/virtual-list";
export type { VirtualListOptions } from "./components/virtual-list";
export { Sparkline } from "./components/sparkline";
export type { SparklineOptions } from "./components/sparkline";
export { NumberFlow } from "./components/number-flow";
export type { NumberFlowOptions } from "./components/number-flow";

// dev
export { FpsProbe, mountFpsHud } from "./dev/fps";
export type { FpsStats } from "./dev/fps";
