/**
 * Embeds a data model
 */

class DCCSubmit extends DCCButton {
  connectedCallback () {
    super.connectedCallback()
  }

  async connect (id, topic) {
    super.connect(id, topic)
    const result = await this.request('data/schema')
    if (result != null && result[id] != null)
      this._schema = result[id]
    console.log('=== requested schema')
    console.log(this._schema)
  }

  _computeTrigger () {
    if (this._active) {
      const message = { sourceType: this.nodeName.toLowerCase() }
      if (this.hasAttribute('label') || this.hasAttribute('topic')) {
        const topic = (this.hasAttribute('topic'))
          ? this.topic : 'button/' + this.label + '/submit'
        if (this.hasAttribute('message')) { message.value = this.message }
        if (this._schema != null) {
          const schema = Object.keys(this._schema)
          console.log('=== form schema')
          console.log(schema)
          for (let s of schema) {
            let field = document.querySelector('#' + s)
            if (field != null)
              message[s] = field.value
          }
        }
        console.log('=== form')
        console.log(topic)
        console.log(message)
        MessageBus.ext.publish(topic, message)
      }
    }
  }
}

(function () {
  DCC.component('dcc-submit', DCCSubmit)
})()