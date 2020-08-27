/**
 * Panel Manager
 *
 * Manages the panels.
 */

class Panels {
  static start () {
    Panels.s = new Panels()
  }

  constructor () {
    this._knotPanelSize = 75
    this._propertiesVisible = false

    this._systemPanel = document.querySelector('#system-panel')
    this._toolbarPanel = document.querySelector('#toolbar-panel')

    this._navigationBlock = document.querySelector('#navigation-block')
    this._knotPanel = document.querySelector('#knot-panel')
    this._knotMain = document.querySelector('#knot-main')
    this._propertiesPanel = document.querySelector('#properties-panel')

    this._buttonExpandNav = document.querySelector('#button-expand-nav')
    this._buttonRetractNav = document.querySelector('#button-retract-nav')
    this._buttonExpandProp = document.querySelector('#button-expand-prop')
    this._buttonRetractProp = document.querySelector('#button-retract-prop')

    this._elementsBlock = document.querySelector('#elements-block')
    this._elementsMain = document.querySelector('#elements-main')

    this._setupKnotHeight()

    this.setupPropertiesExpand = this.setupPropertiesExpand.bind(this)
    MessageBus.ext.subscribe('control/properties/expand',
      this.setupPropertiesExpand)
    this.setupPropertiesRetract = this.setupPropertiesRetract.bind(this)
    MessageBus.ext.subscribe('control/properties/retract',
      this.setupPropertiesRetract)
  }

  _setupKnotHeight () {
    const size = this._knotPanel.getBoundingClientRect()
    this._knotPanel.style.height = Math.round(size.width * 9 / 16) + 'px'
  }

  setupHiddenNavigator () {
    // this._navigationBlock.style.flex = "20%";
    this._navigationBlock.classList.remove('w-25')
    this._navigationBlock.style.display = 'none'
    // this._knotPanel.style.flex = "80%";
    this._knotMain.classList.remove('w-' + this._knotPanelSize)
    this._knotPanelSize += 25
    this._knotMain.classList.add('w-' + this._knotPanelSize)
    this._buttonExpandNav.style.display = 'initial'
    this._buttonRetractNav.style.display = 'none'
  }

  setupVisibleNavigator () {
    // this._navigationBlock.style.flex = "20%";
    // this._knotPanel.style.flex = "80%";
    this._knotMain.classList.remove('w-' + this._knotPanelSize)
    this._knotPanelSize -= 25
    this._knotMain.classList.add('w-' + this._knotPanelSize)
    this._navigationBlock.classList.add('w-25')
    this._navigationBlock.style.display = 'initial'
    this._buttonExpandNav.style.display = 'initial'
    this._buttonRetractNav.style.display = 'initial'
  }

  setupRegularNavigator () {
    this._buttonExpandProp.style.display = 'initial'
    if (this._propertiesVisible) { this.setupPropertiesExpand() }
    this._knotMain.classList.add('w-' + this._knotPanelSize)
    this._navigationBlock.classList.remove('w-100')
    this._navigationBlock.classList.add('w-25')
    this._navigationBlock.style.display = 'initial'
    this._buttonExpandNav.style.display = 'initial'
    this._buttonRetractNav.style.display = 'initial'
  }

  setupWideNavigator () {
    if (this._propertiesVisible) {
      this.setupPropertiesRetract()
      this._propertiesVisible = true
    }
    this._knotMain.classList.remove('w-' + this._knotPanelSize)
    // this._navigationBlock.style.flex = "80%";
    // this._knotPanel.style.flex = "20%";
    this._navigationBlock.classList.remove('w-25')
    this._navigationBlock.classList.add('w-100')
    this._buttonExpandNav.style.display = 'none'
    this._buttonRetractNav.style.display = 'initial'
    this._buttonExpandProp.style.display = 'none'
  }

  setupPropertiesRetract () {
    this._propertiesVisible = false
    this._buttonRetractProp.style.display = 'none'
    this._buttonExpandProp.style.display = 'initial'
    this._elementsBlock.style.display = 'none'
    this._elementsMain.classList.remove('w-25')
    this._knotMain.classList.remove('w-' + this._knotPanelSize)
    this._knotPanelSize += 25
    this._knotMain.classList.add('w-' + this._knotPanelSize)
  }

  setupPropertiesExpand () {
    this._propertiesVisible = true
    this._buttonRetractProp.style.display = 'initial'
    this._buttonExpandProp.style.display = 'none'
    this._elementsBlock.style.display = 'initial'
    this._knotMain.classList.remove('w-' + this._knotPanelSize)
    this._knotPanelSize -= 25
    this._knotMain.classList.add('w-' + this._knotPanelSize)
    this._elementsMain.classList.add('w-25')
  }

  setupProperties () {
    this._navigationBlock.style.flex = '10%'
    this._knotPanel.style.flex = '60%'
    this._propertiesPanel.style.display = 'initial'
    // this._propertiesPanel.style.flex = "30%";
  }

  lockNonEditPanels () {
    this._locks = []
    for (let l = 0; l <= 4; l++) {
      this._locks.push(document.createElement('div'))
      this._locks[l].classList.add('sty-lock')
    }
    this._systemPanel.appendChild(this._locks[0])
    this._toolbarPanel.appendChild(this._locks[1])
    this._navigationBlock.appendChild(this._locks[2])
    this._knotPanel.appendChild(this._locks[3])
    this._elementsBlock.appendChild(this._locks[4])
  }

  unlockNonEditPanels () {
    if (this._locks != null) {
      this._systemPanel.removeChild(this._locks[0])
      this._toolbarPanel.removeChild(this._locks[1])
      this._navigationBlock.removeChild(this._locks[2])
      this._knotPanel.removeChild(this._locks[3])
      this._elementsBlock.removeChild(this._locks[4])
      this._locks = null
    }
  }
}
