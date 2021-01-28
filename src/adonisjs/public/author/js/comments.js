/**
 * Case Comments
 *
 * Manages comments for each knot in a case.
 */

function _harenaCustomUploadAdapterPluginComments( editor ) {
    editor.plugins.get( 'FileRepository' ).createUploadAdapter = ( loader ) => {
        return new HarenaUploadAdapter(loader, Basic.service.currentCaseId, DCCCommonServer.token);
    };
}

class Comments {
  constructor (compiledCase, knotid) {
    this._compiledCase = compiledCase
    this._knotid = knotid
    this.activateComments = this.activateComments.bind(this)
    MessageBus.int.subscribe('control/comments/editor', this.activateComments)
  }

  activateComments () {
    let cKnot = -1
    if (this._compiledCase != null && this._compiledCase.layers.Comments != null) {
      const comments = this._compiledCase.layers.Comments.content
      let cu = 0
      while (cu < comments.length && cKnot == -1) {
        if (comments[cu].type == 'context-open' && comments[cu].context == this._knotid)
          cKnot = cu
        cu++
      }

      if (cKnot != -1) {
        let html = '<hr><h3>Comments</h3>'
        cKnot++
        while (cKnot < comments.length && comments[cKnot].type != 'context-close') {
          html += Translator.instance.objToHTML(comments[cKnot])
          if (comments[cKnot].type == 'text')
            html += '<hr>'
          cKnot++
        }
        this._knotPos = cKnot
        document.querySelector('#comments-display').innerHTML = html
      }
    }

    this.commentsConfirm = this.commentsConfirm.bind(this)
    MessageBus.int.subscribe('control/comments/edit/confirm', this.commentsConfirm)
    this.commentsCancel = this.commentsCancel.bind(this)
    MessageBus.int.subscribe('control/comments/edit/cancel', this.commentsCancel)

    let editorPanel = document.querySelector('#comments-editor')

    DecoupledEditor.create(editorPanel,
      {
        extraPlugins: [_harenaCustomUploadAdapterPluginComments],
        mediaEmbed: {
          extraProviders: [{
             name: 'extraProvider',
             url: /(^https:\/\/drive.google.com[\w/]*\/[^/]+\/)[^/]*/,
             html: match => '<iframe src="' + match[1] + 'preview" width="560" height="315"></iframe>'
           }]
         },
         harena: {
           confirm: 'control/comments/edit/confirm',
           cancel:  'control/comments/edit/cancel'
         }
      } )
      .then( editor => {
        document.querySelector('#comments-toolbar').appendChild(editor.ui.view.toolbar.element)

        window.editor = editor;
        this._editor = editor;
        editor.model.document.on( 'change:data', () => {
          this._textChanged = true
        } );
      } )
      .catch( error => {
        console.error( 'There was a problem initializing the editor.', error );
    } );
  }

  commentsConfirm() {
    let comments = this._compiledCase.layers.Comments.content
    let seq = comments[this._knotPos].seq
    let linefeed1 = {
        type: 'linefeed',
        content: '\n\n',
        seq: seq
    }
    comments.splice(this._knotPos, 0, linefeed1)
    Translator.instance.updateElementMarkdown(linefeed1)
    
    const text = {
      type: 'text',
      content: this._editor.getData(),
      seq: seq+1
    }
    comments.splice(this._knotPos+1, 0, text)
    Translator.instance.updateElementMarkdown(text)

    let linefeed2 = {
        type: 'linefeed',
        content: '\n\n',
        seq: seq+2
    }
    comments.splice(this._knotPos+2, 0, linefeed2)
    Translator.instance.updateElementMarkdown(linefeed2)

    seq += 3
    for (let c = this._knotPos+3; c < comments.length; c++) {
      comments[c].seq = seq
      seq++
    }

    console.log('*** NEW LAYER ***')
    console.log(this._compiledCase.layers.Comments.content)
  }

  commentsCancel () {

  }
}