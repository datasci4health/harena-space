/**
 * Base for all visual components
 */

class DCCVisual extends DCCBase {
  constructor () {
    super()
    this._presentationReady = false
    this._pendingHide = false
    this.editListener = this.editListener.bind(this)
    this.mouseoverListener = this.mouseoverListener.bind(this)
    this.mouseoutListener = this.mouseoutListener.bind(this)
  }

  connectedCallback () {
    super.connectedCallback()
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
    if (this.author && this._presentation) {
      this._activateAuthorPresentation(this._presentation, this)
    }
  }

  // author trigger attachment
  _activateAuthorPresentation (presentation, listener) {
    presentation.style.cursor = 'pointer'
    presentation.dccid = this.id
    presentation.addEventListener('mouseover', listener.mouseoverListener)
  }

  deactivateAuthor () {
    if (this._presentation)
      this._deactivateAuthorPresentation (this._presentation, this)
  }

  _deactivateAuthorPresentation (presentation, listener) {
    presentation.removeEventListener('mouseover', listener.mouseoverListener)
    presentation.style.cursor = 'default'
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
    if (event === 'click') { presentation.style.cursor = 'pointer' }
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
    this.deactivateAuthor()
    // check for a DCC inside a DCC
    if (presentation.tagName.toLowerCase().startsWith('dcc-')) {
      presentation.edit()
    } else {
      if (presentation.style.border) { this._originalBorderStyle = presentation.style.border }
      presentation.style.border = DCCVisual.selectedBorderStyle
    }
  }

  reactivateAuthor () {
    this._reactivateAuthorPresentation(this._presentation, this)
  }

  _reactivateAuthorPresentation (presentation, listener) {
    // check for a DCC inside a DCC
    if (presentation.tagName.toLowerCase().startsWith('dcc-'))
      { presentation.reactivateAuthor() }
    else {
      if (this._originalBorderStyle) {
        presentation.style.border = this._originalBorderStyle
        delete this._originalBorderStyle
      } else { presentation.style.border = 'none' }
    }
    this._activateAuthorPresentation(presentation, listener)
  }

  editListener (buttonType) {
    this._removeEditControls()
    MessageBus.ext.publish('control/element/' + this.id + '/selected',
      {buttonType: buttonType})
  }

  mouseoverListener (event) {
    this._editControls(this._presentation, this)
  }

  mouseoutListener (event) {
    this._removeEditControls()
  }

  _editControls(presentation, listener) {
    this._editControlsPresentation(presentation, listener)
  }

  _removeEditControls(presentation) {
    if (DCCVisual._editPanel != null) {
      // DCCVisual._editPanel.presentation.removeChild(DCCVisual._editPanel.panel)
      document.body.removeChild(DCCVisual._editPanel.panel)
      DCCVisual._editPanel = null
    }
  }

  _editControlsPresentation(presentation, listener) {
    if (DCCVisual._editPanel != null &&
        DCCVisual._editPanel.presentation != presentation)
      this.mouseoutListener()
    if (DCCVisual._editPanel == null) {
      // check for a DCC inside a DCC
      /*
      if (presentation.tagName.toLowerCase().startsWith('dcc-')) {
        presentation._editControls(
          presentation._presentation, this.selectListener) }
      else {
      */
        if (presentation.tagName.toLowerCase().includes('dcc-'))
          presentation = presentation._presentation

        const edButtons = this.editButtons()
        const abPosition = this.absolutePosition(presentation)

        let rect = {
          top: abPosition.y,
          left: abPosition.x,
          width: 45 * edButtons.length,
          height: 50
        }

        let templateHTML = DCCVisual.templateHTML
          .replace(/\{top\}/gm, rect.top)
          .replace(/\{left\}/gm, rect.left)
          .replace(/\{width\}/gm, rect.width)
          .replace(/\{height\}/gm, rect.height)

        for (let eb of edButtons)
          templateHTML += DCCVisual.buttonHTML.replace(/\{type\}/gm, eb.type)
                                              .replace(/\{svg\}/gm, eb.svg)

        templateHTML += '</div>'

        const template = document.createElement('template')
        template.innerHTML = templateHTML
        const panelNode = template.content.cloneNode(true)
        // presentation.appendChild(panelNode)
        document.body.appendChild(panelNode)
        const panel = document.body.querySelector('#panel-presentation')

        for (let eb of edButtons) {
          const eedcc = new editEventDCC(eb.type, listener)
          panel.querySelector('#edit-dcc-' + eb.type)
               .addEventListener('click', eedcc.editListener)
        }
        
        DCCVisual._editPanel = {
          presentation: presentation,
          node: panelNode,
          panel: panel
        }
        DCCVisual._editPanel.panel.addEventListener('mouseout', this.mouseoutListener)
      }
  }

  absolutePosition(element) {
    let x = 0
    let y = 0
    while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
      x += element.offsetLeft - element.scrollLeft;
      y += element.offsetTop - element.scrollTop;
      element = element.offsetParent;
    }
    return {x: x, y: y};
  }

  currentPresentation () {
    return (this._presentation) ? this._presentation : null
  }

  _storePresentation (presentation) {
    this._presentation = presentation
  }

  editButtons () {
    return [DCCVisual.editDCCDefault]
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
        new PresentationDCC(presentation, this.id, role, presentationId, this))
    }
  }

  checkActivateAuthor () {
    if (this.author) {
      for (const pr of this._presentationSet) {
        this._activateAuthorPresentation(pr._presentation, pr) }
    }
  }

  deactivateAuthor () {
    for (const pr of this._presentationSet) {
      this._deactivateAuthorPresentation(pr._presentation, pr) }
  }

  _hideReady () {
    for (const pr of this._presentationSet) { pr._presentation.style.display = 'none' }
  }

  show () {
    for (const pr of this._presentationSet) { pr._presentation.style.display = 'initial' }
  }

  _attachTriggerReady (event, trigger) {
    for (const pr of this._presentationSet) {
      this._attachTriggerPresentation(event, trigger, pr._presentation) }
  }

  removeTrigger (event, trigger) {
    for (const pr of this._presentationSet) {
      if (event == 'click') { pr._presentation.style.cursor = 'default' }
      pr._presentation.removeEventListener(event, trigger)
    }
  }

  edit (role) {
    for (let pr of this._presentationSet) {
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

  _editControls (presentation, listener, role) {
    const pres = this._presentationSet.find(
      pr => ((pr._param == null && role == null) ||
             (pr._param != null && pr._param.role == role)))
    if (pres != null)
      this._editControlsPresentation(pres._presentation, pres)
  }
}

// manages individual in multiple visual DCCs
class PresentationDCC {
  constructor (presentation, id, role, presentationId, owner) {
    this._presentation = presentation
    this._id = id
    this._param = null
    this._owner = owner
    if (role != null || presentationId != null) {
      this._param = {}
      this._param.role = role
      this._param.presentationId = presentationId
    }
    this.editListener = this.editListener.bind(this)
    this.mouseoverListener = this.mouseoverListener.bind(this)
    // this.mouseoutListener = this.mouseoutListener.bind(this)
  }

  editListener (buttonType) {
    this._param.buttonType = buttonType
    MessageBus.ext.publish(
      'control/element/' + this._id + '/selected', this._param)
  }

  mouseoverListener (event) {
    this._owner._editControls(this._presentation, this,
      (this._param != null && this._param.role != null) ? this._param.role : null)
  }

  /*
  mouseoutListener (event) {
    this._owner._removeEditControls(this._presentation, 
      (this._param != null && this._param.role != null) ? this._param.role : null)
  }
  */
}


class editEventDCC {
  constructor(buttonType, listener) {
    this._buttonType = buttonType
    this._listener = listener
    this.editListener = this.editListener.bind(this)
  }

  editListener(event) {
    this._listener.editListener(this._buttonType)
  }
}

(function () {
  DCCVisual.selectedBorderStyle = '3px dashed #000000'

  DCCVisual.templateHTML =
`<div id="panel-presentation" style="position: absolute; top: {top}px; left: {left}px; width: {width}px; height: {height}px; background: rgba(0, 0, 0, 0.5); text-align: left; display: flex; flex-direction: row;">`

  DCCVisual.buttonHTML =
`  <div id="edit-dcc-{type}" style="width: 45px; height: 50px">
    <div style="width: 25px; height: 30px; margin: 10px; color: white">{svg}</div>
  </div>`

  // pen https://fontawesome.com/icons/pen?style=solid
  DCCVisual.editDCCDefault = {
    type: 'default',
    svg:
`<svg viewBox="0 0 512 512">
<path fill="currentColor" d="M290.74 93.24l128.02 128.02-277.99 277.99-114.14 12.6C11.35 513.54-1.56 500.62.14 485.34l12.7-114.22 277.9-277.88zm207.2-19.06l-60.11-60.11c-18.75-18.75-49.16-18.75-67.91 0l-56.55 56.55 128.02 128.02 56.55-56.55c18.75-18.76 18.75-49.16 0-67.91z">
</path></svg>`
  }

  // external-link-alt https://fontawesome.com/icons/external-link-alt?style=solid
  DCCVisual.editDCCExpand = {
    type: 'expand',
    svg:
`<svg viewBox="0 0 512 512">
<path fill="currentColor" d="M432,320H400a16,16,0,0,0-16,16V448H64V128H208a16,16,0,0,0,16-16V80a16,16,0,0,0-16-16H48A48,48,0,0,0,0,112V464a48,48,0,0,0,48,48H400a48,48,0,0,0,48-48V336A16,16,0,0,0,432,320ZM488,0h-128c-21.37,0-32.05,25.91-17,41l35.73,35.73L135,320.37a24,24,0,0,0,0,34L157.67,377a24,24,0,0,0,34,0L435.28,133.32,471,169c15,15,41,4.5,41-17V24A24,24,0,0,0,488,0Z">
</path></svg>`
  }

})()
