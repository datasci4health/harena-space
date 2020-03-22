/* Editor for DCC Texts
  *********************/

/* Extension of the Quill Editor */

let Inline = Quill.import("blots/inline");
let Delta = Quill.import("delta");

class AnnotationBlot extends Inline {
   static create(value) {
      let node = super.create();
      if (value != null)
         node.setAttribute("annotation", value);
      return node;
   }

   static formats(node) {
      return node.getAttribute("annotation");
   }
}
AnnotationBlot.blotName = "annotation";
AnnotationBlot.tagName = "dcc-annotation";
Quill.register(AnnotationBlot);

class SelectBlot extends Inline {
   static create(value) {
      let node = super.create();
      if (value != null) {
         if (value.variable)
            node.setAttribute("variable", value.variable);
         if (value.answer)
            node.setAttribute("answer", value.answer);
      }
      return node;
   }

  static formats(node) {
     let value = {};
     if (node.getAttribute("variable") != null)
        value.variable = node.getAttribute("variable");
     if (node.getAttribute("answer") != null)
        value.answer = node.getAttribute("answer");
     return value;
  }
}
SelectBlot.blotName = "select";
SelectBlot.tagName = "dcc-state-select";
Quill.register(SelectBlot);

class EditDCCText {
   constructor(obj, element, svg) {
      this._objProperties = obj;
      this._handleHighlighter = this._handleHighlighter.bind(this);
      this._handleImageUpload = this._handleImageUpload.bind(this);
      this._handleAnnotation = this._handleAnnotation.bind(this);
      this._handleHlSelect = this._handleHlSelect.bind(this);
      this._handleConfirm = this._handleConfirm.bind(this);
      this._handleCancel = this._handleCancel.bind(this);
      this._editElement = element;
      this._svgDraw = svg;
      this._toolbarControls = EditDCCText.toolbarTemplate +
                              EditDCCText.toolbarTemplateHighlighter +
                              EditDCCText.toolbarTemplateConfirm;
      this._buildEditor(false);
   }

   _buildEditor(selectOptions) {
      Panels.s.lockNonEditPanels();

      this._container = document;
      if (window.parent && window.parent.document) {
         const cont = window.parent.document.querySelector(
            "#inplace-editor-wrapper");
         if (cont != null)
            this._container = cont;
      }
      this._containerRect = this._container.getBoundingClientRect();

      // find the wrapper
      // looks for a knot-wrapper or equivalent
      let elementWrapper = this._editElement;
      let ew = elementWrapper.parentNode;
      while (ew != null && (!ew.id || !ew.id.endsWith("-wrapper")))
         ew = ew.parentNode;
      // otherwise, finds the element outside dccs
      if (ew != null && ew.id && ew.id != "inplace-editor-wrapper")
         elementWrapper = ew;
      else if (elementWrapper.parentNode != null) {
         elementWrapper = elementWrapper.parentNode;
         while (elementWrapper.nodeName.toLowerCase().startsWith("dcc-") &&
                elementWrapper.parentNode != null)
            elementWrapper = elementWrapper.parentNode;
      }

      this._elementRect = elementWrapper.getBoundingClientRect();

      this._editorToolbar = this._buildToolbarPanel();
      this._container.appendChild(this._editorToolbar);

      this._editor = this._buildEditorPanel();
      this._container.appendChild(this._editor);

      this._buildQuillEditor(selectOptions);

      this._editElement.style.display = "none";

      if (selectOptions)
         this._formatSelectOptions();
   }

   _buildToolbarPanel() {
      let editorToolbar = document.createElement("div");
      editorToolbar.classList.add("inplace-editor-floating");
      editorToolbar.innerHTML = this._toolbarControls;

      editorToolbar.style.left = this._transformRelativeX(
         this._elementRect.left - this._containerRect.left);
      editorToolbar.style.bottom = this._transformRelativeY(
         this._containerRect.height - 
            (this._elementRect.top - this._containerRect.top));
      return editorToolbar;
   }

   _buildEditorPanel() {
      let editor = document.createElement("div");
      editor.style.position = "absolute";
      editor.style.left = this._transformRelativeX(
         this._elementRect.left - this._containerRect.left);
      editor.style.top = this._transformRelativeY(
         this._elementRect.top - this._containerRect.top);
      editor.style.width = this._transformRelativeX(this._elementRect.width);
      editor.style.height =
         this._transformRelativeY(this._elementRect.height);
      if (this._svgDraw)
         editor.innerHTML =
            EditDCCText.editorTemplate.svg
               .replace("[width]",
                  this._transformViewportX(this._elementRect.width))
               .replace("[height]",
                  this._transformViewportY(this._elementRect.height));
      else
         editor.innerHTML =
            EditDCCText.editorTemplate.html;
      let inplaceContent = editor.querySelector("#inplace-content");
      const elementStyle = window.getComputedStyle(this._editElement, null);
      const transferFont = ["font-size", "font-family", "font-weight"];
      for (let tf of transferFont)
         inplaceContent.style.setProperty(tf, elementStyle.getPropertyValue(tf));

      const par = this._editElement.querySelector("p");
      if (par != null) {
         const transferMargin = ["margin-top", "margin-right",
                                 "margin-bottom", "margin-left"];
         const parStyle = window.getComputedStyle(par, null);
         const sty = document.createElement("style");
         let styStr = "#inplace-content p {";
         for (let tm of transferMargin)
            styStr += tm + ":" + parStyle.getPropertyValue(tm) + ";";
         styStr + "}";
         sty.innerHTML = styStr;
         document.body.appendChild(sty);
      }

      /*
      inplaceContent.style.fontSize =
         elementStyle.getPropertyValue("font-size");
      inplaceContent.style.fontFamily =
         elementStyle.getPropertyValue("font-family");
      inplaceContent.style.fontWeight =
         elementStyle.getPropertyValue("font-weight");
      */

      return editor;
   }

   // builds a Quill editor
   _buildQuillEditor(selectOptions) {
      let inplaceContent = this._editor.querySelector("#inplace-content");
      const html = Translator.instance.markdownToHTML(
         Translator.instance.objToHTML(this._objProperties, -1));
      inplaceContent.innerHTML = html;

      this._quill = new Quill(inplaceContent, 
         {theme: "snow",
          modules: {
             toolbar: {
               container: this._editorToolbar,
               handlers: {
                  "image"       : this._handleImageUpload,
                  "highlighter" : this._handleHighlighter,
                  "annotation"  : this._handleAnnotation,
                  "hl-select"   : this._handleHlSelect,
                  "confirm"     : this._handleConfirm,
                  "cancel"      : this._handleCancel
               }
             }
          }
         });
      this._editor.classList.add("inplace-editor");

      // toolbar customization
      document.querySelector(".ql-image").innerHTML =
         EditDCCText.buttonImageSVG;
      document.querySelector(".ql-annotation").innerHTML =
         EditDCCText.buttonAnnotationSVG;
      if (!selectOptions)
         document.querySelector(".ql-highlighter").innerHTML =
            EditDCCText.buttonHighlightSVG;
      document.querySelector(".ql-confirm").innerHTML =
         EditDCCText.buttonConfirmSVG;
      document.querySelector(".ql-cancel").innerHTML =
         EditDCCText.buttonCancelSVG;
   }

   _formatSelectOptions() {
      // transforms the highlight select options in HTML
      const selectOptions =
         document.querySelectorAll(".ql-hl-select .ql-picker-item");
      const selectItems = Array.prototype.slice.call(selectOptions);
      selectItems.forEach(item => item.textContent = item.dataset.label);

      this._hlSelect = document.querySelector(
         ".ql-hl-select .ql-picker-label");
      this._hlSelectHTML = this._hlSelect.innerHTML;
      this._hlSelect.innerHTML =
         "<span style='color:lightgray'>diagnostics</span>" +
         this._hlSelectHTML;
   }

   _removeEditor() {
      this._container.removeChild(this._editorToolbar);
      this._container.removeChild(this._editor);
   }

   /*
   _buildAnnotationPanel() {
      let editorAnnotation = document.createElement("div");
      editorAnnotation.classList.add("inplace-editor-floating");
      editorAnnotation.innerHTML = EditDCCText.annotationTemplate;

      const toolbarRect = this._editorToolbar.getBoundingClientRect();
      editorAnnotation.style.left = this._transformRelativeX(
         this._elementRect.left - this._containerRect.left);
      editorAnnotation.style.bottom = this._transformRelativeY(
         this._containerRect.height -
            (this._elementRect.top - this._containerRect.top));

      this._buttonAnConfirm = editorAnnotation.querySelector("#an-confirm");
      this._buttonAnCancel  = editorAnnotation.querySelector("#an-cancel");
      this._anContent = editorAnnotation.querySelector("#an-content");

      return editorAnnotation;
   }
   */

   /*
    * Relative positions defined in percent are automatically adjusted with resize
    */

   _transformRelativeX(x) {
      return (x * 100 / this._containerRect.width) + "%";
   }

   _transformRelativeY(y) {
      return (y * 100 / this._containerRect.height) + "%";
   }

   /*
    * Positions transformed to the viewport size
    */

   _transformViewportX(x) {
      return (x * Basic.referenceViewport.width / this._containerRect.width);
   }

   _transformViewportY(y) {
      return (y * Basic.referenceViewport.height / this._containerRect.height);
   }

   async _handleImageUpload() {
      const range = this._quill.getSelection();
      let buttonClicked =
         await this._handleExtendedPanel(EditDCCText.imageBrowseTemplate);
      if (buttonClicked == "confirm" && this._extendedSub.content.files[0]) {
         const asset = await
            MessageBus.ext.request("data/asset//new",
                 {file: this._extendedSub.content.files[0],
                  caseid: Basic.service.currentCaseId});
         this._quill.insertEmbed(
            range.index, "image", Basic.service.imageResolver(asset.message));
      }
   }

   async _handleAnnotation() {
      const range = this._quill.getSelection();
      let buttonClicked =
         await this._handleExtendedPanel(EditDCCText.annotationTemplate);
      if (buttonClicked == "confirm")
         this._quill.formatText(range.index, range.length,
                                {annotation: this._extendedSub.content.value});
   }

   async _handleHighlighter() {
      const ctxList = Context.instance.listSelectVocabularies();
      this._contextList = EditDCCText.headerTemplate + "<select id='ext-content'>";
      for (let c in ctxList)
         this._contextList +=
            "<option value='" + ctxList[c][0] + "'>" +
               ctxList[c][1] + "</option>";
      this._contextList += "</select>";
      let buttonClicked = await this._handleExtendedPanel(this._contextList);
      if (buttonClicked == "confirm") {
         let vocabulary = this._extendedSub.content.value;

         /*
         MessageBus.ext.publish("control/element/input/new/unique",
            {type: "input",
             subtype: "group select",
             vocabularies: [vocabulary]});
         */

         const first = await this._loadSelectOptions(vocabulary);
         this._handleHlSelect(first, true);
      }
   }

   async _loadSelectOptions(vocabulary) {
      const range = this._quill.getSelection(true);
      let context =
         await Context.instance.loadResource(vocabulary);
      this._highlightOptions = {};
      for (let c in context.states)
         this._highlightOptions[context.states[c]["@id"]] =
            {label:  c,
             symbol: context.states[c].symbol,
             style:  context.states[c].style};

      this._toolbarControls = EditDCCText.toolbarTemplate +
                              "<select class='ql-hl-select'>";
      let first = null;
      for (let op in this._highlightOptions) {
         if (first == null) first = op;
         this._toolbarControls +=
            "<option value='" + op + "'>" +
            this._highlightOptions[op].label + "</option>";
      }
      this._toolbarControls += "</select>" +
                               EditDCCText.toolbarTemplateConfirm;
      Panels.s.unlockNonEditPanels();
      this._removeEditor();
      this._buildEditor(true);
      if (range && range.length > 0)
         this._quill.setSelection(range);
      return first;
   }

   _handleHlSelect(hlSelect, maintainSelect) {
      const range = this._quill.getSelection(true);
      this._hlSelect.innerHTML = this._highlightOptions[hlSelect].label +
                                 this._hlSelectHTML;
      this._quill.formatText(range.index, range.length, {
         select: {answer: this._highlightOptions[hlSelect].symbol}
      });

      if (!maintainSelect)
         this._quill.setSelection(range.index + range.length, 0);
   }

   async _handleExtendedPanel(html) {
      // this._editorAnnotation = this._buildAnnotationPanel();
      this._editorExtended = this._buildExtendedPanel(html);
      this._container.appendChild(this._editorExtended);

      let promise = new Promise((resolve, reject) => {
         const callback = function(button) { resolve(button); };
         this._extendedSub.confirm.onclick = function(e) {
            callback("confirm");
         };
         this._extendedSub.cancel.onclick = function(e) {
            callback("cancel");
         };
      });
      let buttonClicked = await promise;
      this._container.removeChild(this._editorExtended);
      return buttonClicked;
   }

   _buildExtendedPanel(html) {
      let editorExtended = document.createElement("div");
      editorExtended.classList.add("inplace-editor-floating");
      editorExtended.innerHTML = html;

      const toolbarRect = this._editorToolbar.getBoundingClientRect();
      editorExtended.style.left = this._transformRelativeX(
         this._elementRect.left - this._containerRect.left);
      editorExtended.style.bottom = this._transformRelativeY(
         this._containerRect.height -
            (this._elementRect.top - this._containerRect.top));

      this._extendedSub = {
         confirm: editorExtended.querySelector("#ext-confirm"),
         cancel:  editorExtended.querySelector("#ext-cancel"),
         content: editorExtended.querySelector("#ext-content")
      };

      return editorExtended;
   }

   async _handleConfirm() {
      Panels.s.unlockNonEditPanels();

      const objSet = await this._translateContent(this._quill.getContents());

      let obj = objSet[0];
      this._objProperties.type    = obj.type;
      this._objProperties._source = obj._source;
      if (obj.content)
         this._objProperties.content = obj.content;
      if (obj.natural)
         this._objProperties.natural = obj.natural;
      if (obj.formal)
         this._objProperties.formal = obj.formal;

      for (let o = 1; o < objSet.length; o++)
         MessageBus.ext.publish("control/element/insert", objSet[o]);

      MessageBus.ext.publish("control/knot/update");

      this._removeEditor();
   }

   _handleCancel() {
      Panels.s.unlockNonEditPanels();
      MessageBus.ext.publish("control/knot/update");
      this._removeEditor();
   }

   async _translateContent(editContent) {
      let content = "";
      for (let e in editContent.ops) {
         let ec = editContent.ops[e];
         if (ec.insert) {
            if (typeof ec.insert === "string") {
               ec.insert = ec.insert.replace(/\n\n/g, "\n<br>\n").replace(/\n/g, "\n\n");
               if (ec.attributes) {
                  const attr = ec.attributes;
                  if (attr.bold)
                     content += "**" + ec.insert + "**";
                  else if (attr.italic)
                     content += "*" + ec.insert + "*";
                  else if (attr.annotation || attr.select) {
                     content += "{" + ec.insert + "}";
                     if (attr.annotation && attr.annotation.length > 0)
                        content += "(" + attr.annotation
                           .replace(/\(/, "\(")
                           .replace(/\)/, "\)") + ")";
                     if (attr.select && attr.select.answer && attr.select.answer.length > 0)
                        content += "/" + attr.select.answer + "/";
                  }
               } else
                  content += ec.insert;
            } else if (ec.insert.image) {
               let imageURL = ec.insert.image;
               if (imageURL.startsWith("data:")) {
                  const asset = await
                     MessageBus.ext.request("data/asset//new",
                          {b64: imageURL,
                           caseid: Basic.service.currentCaseId});
                  imageURL = asset.message;
               }
               content += "![" +
                  ((ec.attributes && ec.attributes.alt) ? ec.attributes.alt : "image") + "](" +
                  Basic.service.imageAbsoluteToRelative(imageURL) + ")\n";
            }
         }
      }
      content = content.trimEnd();
      content = content.replace(/[\n]+$/g, "") + "\n";
      console.log("=== content");
      console.log(content);
      let unity = {_source: content};
      Translator.instance._compileUnityMarkdown(unity);
      Translator.instance._compileMerge(unity);
      console.log("=== unity");
      console.log(unity);
      return unity.content;
   }
}

(function() {
/* icons from Font Awesome, license: https://fontawesome.com/license */

// image https://fontawesome.com/icons/image?style=regular
EditDCCText.buttonImageSVG =
`<svg viewBox="0 0 512 512">
<path fill="currentColor" d="M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm-6 336H54a6 6 0 0 1-6-6V118a6 6 0 0 1 6-6h404a6 6 0 0 1 6 6v276a6 6 0 0 1-6 6zM128 152c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40-17.909-40-40-40zM96 352h320v-80l-87.515-87.515c-4.686-4.686-12.284-4.686-16.971 0L192 304l-39.515-39.515c-4.686-4.686-12.284-4.686-16.971 0L96 304v48z">
</path></svg>`;

// comment-alt https://fontawesome.com/icons/comment-alt?style=regular
EditDCCText.buttonAnnotationSVG =
`<svg viewBox="0 0 512 512">
<path fill="currentColor" d="M448 0H64C28.7 0 0 28.7 0 64v288c0 35.3 28.7 64 64 64h96v84c0 7.1 5.8 12 12 12 2.4 0 4.9-.7 7.1-2.4L304 416h144c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64zm16 352c0 8.8-7.2 16-16 16H288l-12.8 9.6L208 428v-60H64c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16h384c8.8 0 16 7.2 16 16v288z">
</path></svg>`;

// highlighter https://fontawesome.com/icons/highlighter?style=solid
EditDCCText.buttonHighlightSVG =
`<svg viewBox="0 0 544 512">
<path fill="currentColor" d="M0 479.98L99.92 512l35.45-35.45-67.04-67.04L0 479.98zm124.61-240.01a36.592 36.592 0 0 0-10.79 38.1l13.05 42.83-50.93 50.94 96.23 96.23 50.86-50.86 42.74 13.08c13.73 4.2 28.65-.01 38.15-10.78l35.55-41.64-173.34-173.34-41.52 35.44zm403.31-160.7l-63.2-63.2c-20.49-20.49-53.38-21.52-75.12-2.35L190.55 183.68l169.77 169.78L530.27 154.4c19.18-21.74 18.15-54.63-2.35-75.13z">
</path></svg>`;

// check-square https://fontawesome.com/icons/check-square?style=regular
EditDCCText.buttonConfirmSVG =
`<svg viewBox="0 0 448 512">
<path fill="currentColor" d="M400 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm0 400H48V80h352v352zm-35.864-241.724L191.547 361.48c-4.705 4.667-12.303 4.637-16.97-.068l-90.781-91.516c-4.667-4.705-4.637-12.303.069-16.971l22.719-22.536c4.705-4.667 12.303-4.637 16.97.069l59.792 60.277 141.352-140.216c4.705-4.667 12.303-4.637 16.97.068l22.536 22.718c4.667 4.706 4.637 12.304-.068 16.971z">
</path></svg>`;

// window-close https://fontawesome.com/icons/window-close?style=regular
EditDCCText.buttonCancelSVG =
`<svg viewBox="0 0 512 512">
<path fill="currentColor" d="M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V86c0-3.3 2.7-6 6-6h404c3.3 0 6 2.7 6 6v340zM356.5 194.6L295.1 256l61.4 61.4c4.6 4.6 4.6 12.1 0 16.8l-22.3 22.3c-4.6 4.6-12.1 4.6-16.8 0L256 295.1l-61.4 61.4c-4.6 4.6-12.1 4.6-16.8 0l-22.3-22.3c-4.6-4.6-4.6-12.1 0-16.8l61.4-61.4-61.4-61.4c-4.6-4.6-4.6-12.1 0-16.8l22.3-22.3c4.6-4.6 12.1-4.6 16.8 0l61.4 61.4 61.4-61.4c4.6-4.6 12.1-4.6 16.8 0l22.3 22.3c4.7 4.6 4.7 12.1 0 16.8z">
</path></svg>`;

EditDCCText.toolbarTemplate =
`<button class="ql-bold"></button>
<button class="ql-italic"></button>
<button class="ql-image"></button>
<button class="ql-annotation"></button>`;

EditDCCText.toolbarTemplateHighlighter =
`<button class="ql-highlighter"></button>`;

EditDCCText.toolbarTemplateConfirm =
`<button class="ql-confirm"></button>
<button class="ql-cancel"></button>`;

EditDCCText.editorTemplate = {
html:
`<div id="inplace-content"></div>`,
svg:
`<svg viewBox="0 0 [width] [height]">
   <foreignObject width="100%" height="100%">
      <div id="inplace-content"></div>
   </foreignObject>
</svg>`
};

EditDCCText.headerTemplate =
`<div class="annotation-bar">Annotation
    <div class="annotation-buttons">` +
`      <div id="ext-confirm" style="width:24px">` +
          EditDCCText.buttonConfirmSVG + `</div>` +
`      <div id="ext-cancel" style="width:28px">` +
          EditDCCText.buttonCancelSVG + `</div>` +
`   </div>
</div>`;

EditDCCText.annotationTemplate = EditDCCText.headerTemplate +
`<textarea id="ext-content" rows="3" cols="20"></textarea>`;

EditDCCText.imageBrowseTemplate = EditDCCText.headerTemplate +
`<input type="file" id="ext-content" name="ext-content"
        accept="image/png, image/jpeg, image/svg">`;

EditDCCText.metadataStyle = {
   annotation: "dcc-text-annotation",
   select: "dcc-state-select-area"
};

})();