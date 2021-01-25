class CaseQueueManager {

  constructor(){

    this._nextCase = this._nextCase.bind(this)

    MessageBus.ext.subscribe('case/+/navigate', this._nextCase)
    this.start()
  }

  async start(){
    this._caseList = this._caseList.bind(this)


    MessageBus.int.subscribe('control/dhtml/updated', this._caseList)
  }

  async _caseList () {
    const cl = document.getElementsByClassName('buttons-container')
    var casePlaylist = new Array()
    for (var c in cl) {
      if(cl[c].nodeName === 'DIV'){

        const viewButton = cl[c].firstElementChild
        casePlaylist.push(viewButton.id.substring(1))

        viewButton.addEventListener('click',
        function () {

          const caseIndex = casePlaylist.indexOf(viewButton.id.substring(1))
          casePlaylist = casePlaylist.slice(caseIndex + 1)
          sessionStorage.setItem('caseQueue', JSON.stringify(casePlaylist))
          if((new URL(document.location).pathname.includes('category'))){
            window.location.href =
            '/player/case?id=' + viewButton.id.substring(1) +
            '&list=' + (new URL(document.location).searchParams.get('id'))
          }else{
            window.location.href =
            '/player/case?id=' + viewButton.id.substring(1) +
            '&list=all'
          }
        })
      }
    }
  }

  async _nextCase(){
    // console.log('============ next case')
    // console.log(JSON.parse(sessionStorage.getItem('caseQueue')))

    var casePlaylist = JSON.parse(sessionStorage.getItem('caseQueue'))
    sessionStorage.setItem('caseQueue', JSON.stringify(casePlaylist.slice(1)))
    // console.log('============')
    // console.log(JSON.parse(sessionStorage.getItem('caseQueue')))
      window.location.href =
      '/player/case?id=' + casePlaylist[0]
    }
}

(function () {
  CaseQueueManager.instance = new CaseQueueManager()

})()