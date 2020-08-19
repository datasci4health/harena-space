/**
 * Base for all visual components
 */

class DCCVisual extends DCCBase {
  constructor () {
    super()
    this._presentationReady = false
    this._pendingHide = false
    this.selectListener = this.selectListener.bind(this)
  }

  /*
   static get observedAttributes() {
      return DCCBase.observedAttributes.concat(["style"]);
   }

   static get replicatedAttributes() {
      return DCCBase.replicatedAttributes.concat(["style"]);
   }

   get style() {
      return this.getAttribute("style");
   }

   set style(newValue) {
      this.setAttribute("style", newValue);
   }
   */

  connectedCallback () {
    this.checkActivateAuthor()
  }

  _shadowHTML (html) {
    const template = document.createElement('template')
    template.innerHTML = html
    const shadow = this.attachShadow({ mode: 'open' })
    shadow.appendChild(template.content.cloneNode(true))
    return shadow.querySelector('#presentation-dcc')
  }

  checkActivateAuthor () {
    if (this.author && this._presentation) { this._activateAuthorPresentation(this._presentation, this) }
  }

  // author trigger attachment
  _activateAuthorPresentation (presentation, listener) {
    presentation.style.cursor = 'pointer'
    presentation.dccid = this.id
    presentation.addEventListener('click', listener.selectListener)
  }

  hide () {
    if (this._presentationReady) { this._hideReady() } else { this._pendingHide = true }
  }

  _hideReady () {
    this._presentation.style.display = 'none'
  }

  show () {
    this._presentation.style.display = 'initial'
  }

  // an external trigger attachment from TriggerDCC
  attachTrigger (event, trigger) {
    if (this._presentationReady) { this._attachTriggerReady(event, trigger) } else if (this._pendingTrigger == null) { this._pendingTrigger.push([event, trigger]) } else { this._pendingTrigger = [[event, trigger]] }
  }

  _attachTriggerReady (event, trigger) {
    this._attachTriggerPresentation(event, trigger, this._presentation)
  }

  _attachTriggerPresentation (event, trigger, presentation) {
    if (event == 'click') { presentation.style.cursor = 'pointer' }
    presentation.addEventListener(event, trigger)
  }

  removeTrigger (event, trigger) {
    this._presentation.removeEventListener(event, trigger)
  }

  _presentationIsReady () {
    this._presentationReady = true
    if (this._pendingTrigger != null) {
      for (const t of this._pendingTrigger) { this._attachTriggerReady(t[0], t[1]) }
    }
    this._pendingTrigger = null
    if (this._pendingHide) {
      this._pendingHide = false
      this._hideReady()
    }
  }

  // ignores role argument
  edit () {
    this._editPresentation(this._presentation, this)
  }

  _editPresentation (presentation, listener) {
    presentation.removeEventListener('click', listener.selectListener)
    presentation.style.cursor = 'default'
    // check for a DCC inside a DCC
    if (presentation.tagName.toLowerCase().startsWith('dcc-')) { presentation.edit() } else {
      if (presentation.style.border) { this._originalBorderStyle = presentation.style.border }
      presentation.style.border = DCCVisual.selectedBorderStyle
    }
  }

  reactivateAuthor () {
    this._reactivateAuthorPresentation(this._presentation, this)
  }

  _reactivateAuthorPresentation (presentation, listener) {
    // check for a DCC inside a DCC
    if (presentation.tagName.toLowerCase().startsWith('dcc-')) { presentation.reactivateAuthor() } else {
      if (this._originalBorderStyle) {
        presentation.style.border = this._originalBorderStyle
        delete this._originalBorderStyle
      } else { presentation.style.border = 'none' }
    }
    this._activateAuthorPresentation(presentation, listener)
  }

  selectListener (event) {
    MessageBus.ext.publish('control/element/' + this.id + '/selected')
  }

  currentPresentation () {
    return (this._presentation) ? this._presentation : null
  }

  _storePresentation (presentation) {
    this._presentation = presentation
  }
}

class DCCMultiVisual extends DCCVisual {
  constructor () {
    super()
    this._presentationSet = []
  }

  _storePresentation (presentation, role, presentationId) {
    super._storePresentation(presentation)
    if (presentation != null) {
      this._presentationSet.push(
        new PresentationDCC(presentation, this.id, role, presentationId))
    }
  }

  checkActivateAuthor () {
    if (this.author) {
      for (const pr of this._presentationSet) { this._activateAuthorPresentation(pr._presentation, pr) }
    }
  }

  _hideReady () {
    for (const pr of this._presentationSet) { pr._presentation.style.display = 'none' }
  }

  show () {
    for (const pr of this._presentationSet) { pr._presentation.style.display = 'initial' }
  }

  _attachTriggerReady (event, trigger) {
    for (const pr of this._presentationSet) { this._attachTriggerPresentation(event, trigger, pr._presentation) }
  }

  removeTrigger (event, trigger) {
    for (const pr of this._presentationSet) {
      if (event == 'click') { pr._presentation.style.cursor = 'default' }
      pr._presentation.removeEventListener(event, trigger)
    }
  }

  edit (role) {
    for (const pr of this._presentationSet) {
      if ((pr._param == null && role == null) ||
             (pr._param != null && pr._param.role == role)) {
        this._editedPresentation = pr
        this._editPresentation(pr._presentation, pr)
      }
    }
  }

  reactivateAuthor () {
    if (this._editedPresentation) {
      this._reactivateAuthorPresentation(this._editedPresentation._presentation,
        this._editedPresentation)
      delete this._editedPresentation
    }
  }

  currentPresentation () {
    return (this._editedPresentation)
      ? this._editedPresentation._presentation : null
  }
}

// manages individual in multiple visual DCCs
class PresentationDCC {
  constructor (presentation, id, role, presentationId) {
    this._presentation = presentation
    this._id = id
    this._param = null
    if (role != null || presentationId != null) {
      this._param = {}
      this._param.role = role
      this._param.presentationId = presentationId
    }
    this.selectListener = this.selectListener.bind(this)
  }

  selectListener () {
    MessageBus.ext.publish(
      'control/element/' + this._id + '/selected', this._param)
  }
}

(function () {
  DCCVisual.selectedBorderStyle = '3px dashed #000000'
})()
