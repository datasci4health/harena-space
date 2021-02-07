class LayoutController {
  constructor () {
    this._case = null
    this._user = null
    this.busMessages()
    this.startController()
  }

  set case (newValue) {
    this._case = newValue
  }

  get case () {
    return this._case
  }

  set user (newValue) {
    this._user = newValue
  }

  get user () {
    return this._user
  }

  async startController(){
    await MessageBus.ext.waitMessage('control/case/ready')

    this.dynamicAuthor()
  }

  async busMessages(){
    LayoutController.user = await MessageBus.int.waitMessage('data/user/info')
    LayoutController.case = await MessageBus.ext.waitMessage('service/response/get/harena-case')

  }

  async dynamicAuthor (){

    if(LayoutController.case.message.category_id === 'pocus-training'
    && LayoutController.user.message.institution === 'hcpa'){
      const toolbarDiv = document.querySelector('#div-toolbar-rightside')
      toolbarDiv.innerHTML =
      `<dcc-rest id="harena-ask-feedback" bind="harena-ask-feedback"
      subscribe="service/request/post:retrieve"></dcc-rest>
      <dcc-rest id="harena-case-property" bind="harena-case-property"></dcc-rest>
      <form id="form-case-property">
      <input type="hidden" id="property_value" name="property_value" value="">
      <input type="hidden" id="property_title" name="property_title" value="feedback">


      </form>`
      // ------------------------------------------------------------------------------- //



      const dccSubmitProp = document.createElement('dcc-submit')
      const userGrade = LayoutController.user.message.grade
      const formProp = document.querySelector('#form-case-property')
      const inputPropertyValue = document.querySelector('#property_value')


      if(userGrade === 'aluno'){

        dccSubmitProp.setAttribute('id','dcc-submit-feedback')
        dccSubmitProp.setAttribute('bind','submit-case-property')
        dccSubmitProp.setAttribute('xstyle','btn btn-secondary m-1')
        dccSubmitProp.setAttribute('label','Set Feedback Complete')
        dccSubmitProp.setAttribute('topic','service/request/pos')
        dccSubmitProp.setAttribute('connect','submit:harena-case-property:service/request/post')
        dccSubmitProp.setAttribute('data-toggle','tooltip')
        dccSubmitProp.setAttribute('data-placement','top')
        dccSubmitProp.setAttribute('title',"Send case for professor's feedback")
        await formProp.appendChild(dccSubmitProp)
        inputPropertyValue.value = '0'

      }else if(userGrade === 'professor' || userGrade === 'coordinator'){
        dccSubmitProp.setAttribute('id','dcc-submit-feedback')
        dccSubmitProp.setAttribute('bind','submit-case-property')
        dccSubmitProp.setAttribute('xstyle','btn btn-secondary m-1')
        dccSubmitProp.setAttribute('label','Set Feedback Complete')
        dccSubmitProp.setAttribute('topic','service/request/put')
        dccSubmitProp.setAttribute('connect','submit:harena-case-property:service/request/put')
        dccSubmitProp.setAttribute('data-toggle','tooltip')
        dccSubmitProp.setAttribute('data-placement','top')
        dccSubmitProp.setAttribute('title',"Sets feedback as finished (for your student's knowlegde)")

        await formProp.appendChild(dccSubmitProp)

        // btnFeedback.title = "Sets feedback as finished (for your student's knowlegde)"
        inputPropertyValue.value = '1'
      }
      this.feedbackButtonCaseState()

      if(LayoutController.user.message.institution === 'hcpa'){

      }
    }

  }

  async dynamicMenu (){

  }

  async feedbackButtonCaseState (propValue){
    const userGrade = LayoutController.user.message.grade
    const btnFeedback = document.querySelector('#dcc-submit-feedback')
    if(propValue){
      LayoutController.case.message.property.feedback = propValue
    }
    if(userGrade === 'aluno'){

      //Verifies property 'feedback' to disable button and change layout
      if(LayoutController.case.message.property.feedback){
        if(LayoutController.case.message.property.feedback == 0){

          btnFeedback.firstElementChild.innerHTML = 'Waiting Feedback'
        }else {
          btnFeedback.firstElementChild.innerHTML = 'Feedback Recieved'
        }

        btnFeedback.setAttribute('disabled','disabled')
        btnFeedback.style.pointerEvents = 'none'
        document.querySelector('#dcc-submit-feedback').removeAttribute('topic')
        document.querySelector('#dcc-submit-feedback').removeAttribute('connect')
        try {
          document.querySelector('#property_value').remove()
          document.querySelector('#property_title').remove()
          document.querySelector('#harena-case-property').remove()
          document.querySelector('#harena-ask-feedback').remove()
        } catch (e) {
          console.log(e)
        }
      }

    }else if(userGrade === 'professor' || userGrade === 'coordinator'){
      if(document.querySelector('#harena-ask-feedback'))
        document.querySelector('#harena-ask-feedback').remove()

      let casePropertyRest = document.querySelector('#harena-case-property')
      let caseDccSubmit = document.querySelector('#dcc-submit-feedback')

      if(LayoutController.case.message.property.feedback){
        btnFeedback.firstElementChild.innerHTML = 'Set Feedback Complete'

        if(LayoutController.case.message.property.feedback == 1){
          casePropertyRest.remove()
          btnFeedback.firstElementChild.innerHTML = 'Feedback Sent'
          btnFeedback.setAttribute('disabled','disabled')
          btnFeedback.style.pointerEvents = 'none'
          caseDccSubmit.removeAttribute('topic')
          caseDccSubmit.removeAttribute('connect')
          try {
            document.querySelector('#property_value').remove()
            document.querySelector('#property_title').remove()
          } catch (e) {
            console.log(e)
          }

        }
      }
    }
  }

}
(function () {
  LayoutController.instance = new LayoutController()

})()