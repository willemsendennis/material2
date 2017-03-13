import {
  ChangeDetectionStrategy,
  Component, EventEmitter,
  Input,
  OnDestroy,
  Optional, Output,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation
} from '@angular/core';
import {Overlay} from '../core/overlay/overlay';
import {OverlayRef} from '../core/overlay/overlay-ref';
import {TemplatePortal} from '../core/portal/portal';
import {OverlayState} from '../core/overlay/overlay-state';
import {Dir} from '../core/rtl/dir';
import {MdError} from '../core/errors/error';
import {MdDialog} from '../dialog/dialog';
import {MdDialogRef} from '../dialog/dialog-ref';
import {PositionStrategy} from '../core/overlay/position/position-strategy';
import {
  OriginConnectionPosition,
  OverlayConnectionPosition
} from '../core/overlay/position/connected-position';
import {SimpleDate} from '../core/datetime/simple-date';
import {MdDatepickerInput} from './datepicker-input';
import {CalendarLocale} from '../core/datetime/calendar-locale';


/** Component responsible for managing the datepicker popup/dialog. */
@Component({
  moduleId: module.id,
  selector: 'md-datepicker, mat-datepicker',
  templateUrl: 'datepicker.html',
  styleUrls: ['datepicker.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MdDatepicker implements OnDestroy {
  /** The date to open the calendar to initially. */
  @Input()
  get startAt(): SimpleDate {
    // If an explicit startAt is set we start there, otherwise we start at whatever the currently
    // selected value is.
    if (this._startAt) {
      return this._startAt;
    }
    if (this._datepickerInput) {
      return this._datepickerInput.value;
    }
    return null;
  }
  set startAt(date: SimpleDate) { this._startAt = this._locale.parseDate(date); }
  private _startAt: SimpleDate;

  /**
   * Whether the calendar UI is in touch mode. In touch mode the calendar opens in a dialog rather
   * than a popup and elements have more padding to allow for bigger touch targets.
   */
  @Input()
  touchUi = false;

  @Output() selectedChanged = new EventEmitter<SimpleDate>();

  get _selected(): SimpleDate {
    return this._datepickerInput ? this._datepickerInput.value : null;
  }
  set _selected(value: SimpleDate) {
    this.selectedChanged.emit(value);
    this.close();
  }

  /** The calendar template. */
  @ViewChild(TemplateRef) calendarTemplate: TemplateRef<any>;

  /** A reference to the overlay when the calendar is opened as a popup. */
  private _popupRef: OverlayRef;

  /** A reference to the dialog when the calendar is opened as a dialog. */
  private _dialogRef: MdDialogRef<any>;

  /** A portal containing the calendar for this datepicker. */
  private _calendarPortal: TemplatePortal;

  /** The input element this datepicker is associated with. */
  private _datepickerInput: MdDatepickerInput;

  constructor(private _dialog: MdDialog, private _overlay: Overlay,
              private _viewContainerRef: ViewContainerRef, private _locale: CalendarLocale,
              @Optional() private _dir: Dir) {}

  ngOnDestroy() {
    this.close();
    if (this._popupRef) {
      this._popupRef.dispose();
    }
  }

  /**
   * Register an input with this datepicker.
   * @param inputElementRef An ElementRef for the input.
   */
  _registerInput(input: MdDatepickerInput): void {
    if (this._datepickerInput) {
      throw new MdError('An MdDatepicker can only be associated with a single input.');
    }
    this._datepickerInput = input;
  }

  /**
   * Open the calendar.
   * @param touchUi Whether to use the touch UI.
   */
  open(): void {
    if (!this._datepickerInput) {
      throw new MdError('Attempted to open an MdDatepicker with no associated input.');
    }

    if (!this._calendarPortal) {
      this._calendarPortal = new TemplatePortal(this.calendarTemplate, this._viewContainerRef);
    }

    this.touchUi ? this._openAsDialog() : this._openAsPopup();
  }

  /** Close the calendar. */
  close(): void {
    if (this._popupRef && this._popupRef.hasAttached()) {
      this._popupRef.detach();
    }
    if (this._dialogRef) {
      this._dialogRef.close();
      this._dialogRef = null;
    }
    if (this._calendarPortal && this._calendarPortal.isAttached) {
      this._calendarPortal.detach();
    }
  }

  /** Open the calendar as a dialog. */
  private _openAsDialog(): void {
    this._dialogRef = this._dialog.open(this.calendarTemplate);
  }

  /** Open the calendar as a popup. */
  private _openAsPopup(): void {
    if (!this._popupRef) {
      this._createPopup();
    }

    if (!this._popupRef.hasAttached()) {
      this._popupRef.attach(this._calendarPortal);
    }

    this._popupRef.backdropClick().first().subscribe(() => this.close());
  }

  /** Create the popup. */
  private _createPopup(): void {
    const overlayState = new OverlayState();
    overlayState.positionStrategy = this._createPopupPositionStrategy();
    overlayState.hasBackdrop = true;
    overlayState.backdropClass = 'md-overlay-transparent-backdrop';
    overlayState.direction = this._dir ? this._dir.value : 'ltr';

    this._popupRef = this._overlay.create(overlayState);
  }

  /** Create the popup PositionStrategy. */
  private _createPopupPositionStrategy(): PositionStrategy {
    let origin = {originX: 'start', originY: 'bottom'} as OriginConnectionPosition;
    let overlay = {overlayX: 'start', overlayY: 'top'} as OverlayConnectionPosition;
    return this._overlay.position().connectedTo(
        this._datepickerInput.getPopupConnectionElementRef(), origin, overlay);
  }
}
