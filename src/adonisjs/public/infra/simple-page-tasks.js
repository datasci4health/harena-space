class PageController {
  constructor () {
    let isPageReady = false
    let dhtmlLoaded = false
    let hasremovedLoading = false
    PageController.scriptsComplete = false
    this.removeLoadingIcon = this.removeLoadingIcon.bind(this)
    this.pageReady = this.pageReady.bind(this)

    window.addEventListener("load", function(event) {
      if (!PageController.scriptsComplete && document.querySelector('main')) {
        const template = document.createElement('template')
        template.innerHTML = PageController.loadingBox
        document.querySelector('body').appendChild(template.content.cloneNode(true))
        document.querySelector('main').classList.add('invisible')
      }

      // console.log(PageController.scriptsComplete)
    })
    MessageBus.int.subscribe('control/dhtml/ready', this.removeLoadingIcon)
    MessageBus.ext.subscribe('control/case/ready', this.removeLoadingIcon)
    MessageBus.int.subscribe('control/validate/ready', this.removeLoadingIcon)
    MessageBus.int.subscribe('control/html/ready', this.pageReady)
  }
  async pageReady(){
    PageController.instance.paginationButtons(parseInt(new URL(document.location).searchParams.get('page') || 1))
    if(!this.isPageReady){
      // Verifies if the page contains the correct element
      if(document.querySelector('#filter-form')){
        let filterElements = []
        if(document.querySelector('#fInstitution'))
          filterElements.push(document.querySelector('#fInstitution').id)
        if(document.querySelector('#fUserType'))
          filterElements.push(document.querySelector('#fUserType').id)
        if(document.querySelector('#fSpecialty'))
          filterElements.push(document.querySelector('#fSpecialty').id)
        if(document.querySelector('#fPropertyValue'))
          filterElements.push(document.querySelector('#fPropertyValue').id)
        if(document.querySelector('#limit'))
          filterElements.push(document.querySelector('#limit').id)
        PageController.instance.updateValuesFromUrl(filterElements)
      }
    }
    //Set listener to hide elements on scroll down
    if(document.querySelector('.main-scroll')){
    let prevScrollpos = document.querySelector('.main-scroll').scrollTop
    document.querySelector('.main-scroll').addEventListener('scroll', function() {
      let currentScrollPos = document.querySelector('.main-scroll').scrollTop
      if (prevScrollpos > currentScrollPos) {
        document.querySelector('.up-scroll').style.top = "0"
      } else {
        document.querySelector('.up-scroll').style.top = "-50px"
      }
      prevScrollpos = currentScrollPos;
    })
    }

    if(new URL(document.location).pathname.includes('/prognosis')){
      this.prognosisGameDropdownMenu()
    }
    this.isPageReady = true
  }

  async removeLoadingIcon(){
    let dhtmlList = document.querySelectorAll('dcc-dhtml')
    this.dhtmlLoaded = true
    for(let i in dhtmlList){
      if(dhtmlList[i]._ready == false){
        this.dhtmlLoaded = false
      }
    }
    if(!this.hasremovedLoading && this.dhtmlLoaded){
      if(document.querySelector('#loading-page-container')){
        setTimeout(function(){
          document.querySelector('main').classList.remove('invisible')
          if(document.querySelector('#loading-page-container'))
          document.querySelector('#loading-page-container').remove()
          MessageBus.int.publish('control/html/ready')
        }, 500)
      }
      try {
        setTimeout(function(){
          document.querySelector('main').classList.remove('invisible')
        }, 3000)

      } catch (e) {
        console.log('Error while trying to remove class "invisible" of "main" element');
        console.log(e)
      }
      PageController.instance.appropriateBreadcrumb()

      PageController.scriptsComplete = true
      // console.log(PageController.scriptsComplete)
      this.hasremovedLoading = true

    }
  }

  controlDropdownMenu(){
    $(document).on('click', '.dropdown-menu', function (e) {
      e.stopPropagation();
    });

  }

  async harenaVersionFootNote(){
    if(!sessionStorage.getItem('harena-version')){
      const config = {
        url: 'https://api.github.com/repos/harena-lab/harena-space/releases/latest',
      }
      await axios(config)
      .then(function (endpointResponse) {
        sessionStorage.setItem('harena-version', endpointResponse.data.tag_name)
        console.log(endpointResponse.data.tag_name)

      })
      .catch(function (error) {
        console.log(error)
      })
    }
    window.addEventListener("load", function(event) {
      if(document.querySelector('#version-footnote'))
      document.querySelector('#version-footnote')
      .innerHTML = 'Harena Version - ' + sessionStorage.getItem('harena-version')
    })
  }

  async appropriateBreadcrumb(){
    let url = new URL(window.location)
    if(url.pathname == '/player/case/'){
      if(url.searchParams.get('preview')){
        const breadcrumbGroup = document.querySelector('#breadcrumb-group')
        for (let c = 0; c < breadcrumbGroup.childElementCount;){
          // console.log('============')
          // console.log('child count updated')
          // console.log(breadcrumbGroup.childElementCount)

          // console.log('current child')
          // console.log(c)
          // console.log(breadcrumbGroup.children[c])
          // console.log('============')
          if(!breadcrumbGroup.children[c].id){
            // console.log('not found id..deleting element')
            // console.log(breadcrumbGroup.children[c])
            breadcrumbGroup.removeChild(breadcrumbGroup.children[c])
            c = 0
            // console.log('returning index to ' + c)
          }else {
            // console.log('found id')
            // console.log(breadcrumbGroup.children[c])
            c++
          }
        }
        document.querySelector('#case-list-breadcrumb').firstElementChild.innerHTML = 'Return'
      }else if(url.searchParams.get('list') == 'all'){
        document.querySelector('#case-list-breadcrumb').firstElementChild.href = '/player/home/?clearance=1'
      }else{
        document.querySelector('#case-list-breadcrumb').firstElementChild.href =
        '/player/home/category/cases/?id='+ url.searchParams.get('list') +'&clearance=1'
      }
    }
  }
  /*
    paginationButtons controls the pagination layout
    Needs a element with id 'pagination-wrapper' to build the buttons
  */
////////////////////////////////////////////////////////////////////////////////
  async paginationButtons(p){

    if(document.querySelector('#pages') && document.querySelector('#pagination-wrapper')){
      var state = {
        'nPages': document.querySelector('#pages').value,
        'page': p,
        'window': 4,
      }
      if(state.nPages > 1){
        var wrapper = document.querySelector('#pagination-wrapper')
        wrapper.innerHTML = (``)
        var maxLeft = (state.page - Math.floor(state.window / 2))
        var maxRight = (state.page + Math.floor(state.window / 2))

        if (maxLeft < 1) {
          maxLeft = 1
          maxRight = state.window
        }

        if (maxRight > state.nPages) {
          maxLeft = state.nPages - (state.window - 1)

          if (maxLeft < 1){
            maxLeft = 1
          }
          maxRight = state.nPages
        }


        for (var page = maxLeft; page <= maxRight; page++) {
          if(page === state.page){
            wrapper.innerHTML += `<button value=${page} class="page page-btn btn btn-sm btn-secondary disabled">${page}</button>`
          }else{
            wrapper.innerHTML += `<button value=${page} class="page page-btn btn btn-sm btn-secondary">${page}</button>`
          }

        }

        if (state.page != 1) {
          wrapper.innerHTML = `<button value=${1} class="page page-btn btn btn-sm btn-secondary">&#171; First</button>` + wrapper.innerHTML
        }

        if (state.page != state.nPages) {
          wrapper.innerHTML += `<button value=${state.nPages} class="page page-btn btn btn-sm btn-secondary">Last &#187;</button>`
        }

        $('.page').on('click', function() {
          if(!$(this).hasClass('disabled')){
            var url = new URL(document.location)
            url.searchParams.set('page', Number($(this).val()))
            document.location = url
          }
        })
      }
    }
  }
////////////////////////////////////////////////////////////////////////////////

  async updateValuesFromUrl(parent){
    var url = new URL(document.location)
    for (var e in parent){
      if (url.searchParams.get(parent[e])){
        var element = document.querySelector('#'+ parent[e])
        element.value = url.searchParams.get(parent[e])
      }
    }
  }

  async prognosisGameDropdownMenu (){
    const header = document.querySelector('#harena-header')
    let template = document.createElement('template')
    template.innerHTML = PageController.prognosisGameDropdownMenu
    header.insertBefore(template.content.cloneNode(true), header.firstElementChild)
  }
}
(function () {
  PageController.instance = new PageController()
  PageController.instance.controlDropdownMenu()
  PageController.instance.harenaVersionFootNote()
  PageController.loadingBox =
  `<div id="loading-page-container" class="d-flex flex-column justify-content-center align-items-center" style="position:absolute; top:50%; left:50%;">
  <div class="spinner-border align-self-center" role="status" aria-hidden="true"></div>
  <strong class="align-self-center">Loading...</strong>
  </div>`
  PageController.prognosisGameDropdownMenu =`
  <div class=" ml-2 harena-menu">
    <button class="btn btn-secondary" type="button" id="dropdownMenu2" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
      <i class="fas fa-bars"></i>
    </button>
    <div class="dropdown-menu bg-plaster" aria-labelledby="dropdownMenu2">
      <a class="dropdown-item" href="/prognosis/">Página inicial</a>
      <div class="dropdown-divider"></div>
      <a class="dropdown-item" href="/prognosis/learn">Aprendendo Prognóstico</a>
      <a class="dropdown-item" href="/prognosis/learn/progress">Lista de fases</a>
    </div>
  </div>`
})()
