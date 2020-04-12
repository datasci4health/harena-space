/* Editor for DCC Images
  **********************/

class EditDCCImage extends EditDCC {
   constructor(obj, element) {
      super(element);
      this._objProperties = obj;
      // this._editElement = element;
      // this._commons = new EditDCC(element);
      this._buildImageSelector();
   }

   _buildImageSelector() {
      /*
      this._editorWrapper = document;
      if (window.parent && window.parent.document) {
         const cont = window.parent.document.querySelector("#inplace-editor-wrapper");
         if (cont != null)
            this._editorWrapper = cont;
      }
      */
      
      this._editor = this._buildEditorPanel();
      this._editorWrapper.appendChild(this._editor);
   }

   _buildEditorPanel() {
      let editor = document.createElement("div");
      editor.style.position = "absolute";
      editor.style.left = this._transformRelativeX(
         this._elementWrapperRect.left - this._containerRect.left);
      editor.style.top = this._transformRelativeY(
         this._elementWrapperRect.top - this._containerRect.top);
      editor.style.width = this._transformRelativeX(this._elementWrapperRect.width);
      editor.style.height = this._transformRelativeY(this._elementWrapperRect.height);
      editor.style.fontSize =
         window.getComputedStyle(this._editElement, null).getPropertyValue("font-size");
      editor.innerHTML =
         EditDCCImage.editorTemplate
            .replace("[width]", this._transformViewportX(this._elementWrapperRect.width))
            .replace("[height]", this._transformViewportY(this._elementWrapperRect.height));
      this._updateImage = this._updateImage.bind(this);
      this._imageField = editor.querySelector("#pfieldimage");
      this._imageField.addEventListener("change", this._updateImage);
      return editor;
   }

   async _updateImage() {
      if (this._imageField.files[0]) {
         const asset = await
            MessageBus.ext.request("data/asset//new",
                 {file: this._imageField.files[0],
                  caseid: Basic.service.currentCaseId});
         this._objProperties.image.path = asset.message;
      }
      MessageBus.ext.publish("properties/apply");
      this._editorWrapper.removeChild(this._editor);
   }

   /*
    * Relative positions defined in percent are automatically adjusted with resize
    */

   /*
   _transformRelativeX(x) {
      return (x * 100 / this._containerRect.width) + "%";
   }

   _transformRelativeY(y) {
      return (y * 100 / this._containerRect.height) + "%";
   }
   */

   /*
    * Positions transformed to the viewport size
    */

   /*
   _transformViewportX(x) {
      return (x * Basic.referenceViewport.width / this._containerRect.width);
   }

   _transformViewportY(y) {
      return (y * Basic.referenceViewport.height / this._containerRect.height);
   }
   */

   /*
   _handleHlSelect(hlSelect) {
      this._hlSelect.innerHTML = this._highlightOptions[hlSelect].label +
                                 this._hlSelectHTML;
      const range = this._quill.getSelection();
      this._quill.formatText(range.index, range.length, {
         metadata: {type:  "option",
                    label: this._highlightOptions[hlSelect].label,
                    style: this._highlightOptions[hlSelect].style}
      });
   }
   */
}

(function() {
EditDCCImage.editorTemplate =
`<foreignObject width="100%" height="100%">
    <div class="styd-notice styd-border-notice">
        <input type="file" id="pfieldimage" name="pfieldimage" class="styd-selector styp-field-value"
               accept="image/png, image/jpeg, image/svg">
      </div>
</foreignObject>`;

})();