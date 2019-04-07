/*
function startSystem() {
   let dm = new AuthorManager();
}
*/

class AuthorManager {
   constructor() {
      window.messageBus.page = new MessageBus(false);
      
      this._knotGenerateCounter = 2;
      
      this._translator = new Translator();
      this._compiledCase = null;
      this._knots = null;
      
      this._navigator = new Navigator();
      
      this._server = new DCCAuthorServer();
      
      this._currentTemplateFamily = "jacinto";
      this._currentCaseName = null;
      this._knotSelected = null;
      this._htmlKnot = null;
      this._renderSlide = true;
      this._editor = null;
      
      this.controlEvent = this.controlEvent.bind(this);
      window.messageBus.ext.subscribe("control/#", this.controlEvent);
      
      this.selectKnot = this.selectKnot.bind(this);
      window.messageBus.ext.subscribe("knot/+/selected", this.selectKnot);

      this._templateFamilySelected = this._templateFamilySelected.bind(this);
      this.newKnot = this.newKnot.bind(this);
      this._caseNameSelected = this._caseNameSelected.bind(this);
      
      this._temporaryCase = true;
   }
   
   start() {
      this._navigationPanel = document.querySelector("#navigation-panel");
      this._knotPanel = document.querySelector("#knot-panel");
      this._messageSpace = document.querySelector("#message-space");
      
      window.messageBus.ext.publish("control/case/new", "");
   }
   
   /*
    * `control/case/load`
    * `control/case/save`
    * `control/case/play`
    * `control/knot/edit`
    * `control/config/edit`

    * `knot/<knot>/selected`

    */
   controlEvent(topic, message) {
      switch (topic) {
         case "control/case/new":  this.newCase();
                                   break;
         case "control/case/load": this.selectCase();
                                   break;
         case "control/case/save": this.saveCase();
                                   break;
         case "control/knot/new":  this.modelLoad();
                                   break;
         case "control/knot/edit": this.editKnot();
                                   break;
         case "control/case/play": this.playCase();
                                   break;
         case "control/config/edit": this.config();
                                     break;
         /*
         case "control/knot/selected": this.selectKnot(message);
                                        break;
         */
      }
   }
   
   /*
    * ACTION: control-load (1)
    */
   async selectCase() {
      this._resourcePicker = new DCCResourcePicker();
      this._resourcePicker.resource = "case";
      
      window.messageBus.ext.subscribe("control/case/selected", this._caseNameSelected);
      
      const cases = await window.messageBus.ext.request("case/*/get", "", "case/*");
      this._resourcePicker.addSelectList(cases.message);
      this._knotPanel.appendChild(this._resourcePicker);
   }

   /*
    * ACTION: control-load (2)
    */
   async _caseNameSelected(topic, message) {
      console.log(topic);
      this._temporaryCase = false;
      window.messageBus.ext.unsubscribe("control/case/selected", this._caseNameSelected);
      this._caseLoad(message.selected);
      this._knotPanel.removeChild(this._resourcePicker);
   }
   
   /*
    * ACTION: control-new
    */
   async newCase() {
      this._temporaryCase = true;
      const caseName = await window.messageBus.ext.request("case/_temporary/new", "",
                                                           "case/_temporary/set/status");
      this._caseLoad("_temporary");
   }

   /*
    * ACTION: control-load (3)
    */
   async _caseLoad(caseName) {
      this._currentCaseName = caseName;
      const caseMd = await window.messageBus.ext.request("case/" + this._currentCaseName + "/get", "",
                                                         "case/" + this._currentCaseName);
      
      this._compiledCase = this._translator.compileMarkdown(this._currentCaseName, caseMd.message);
      this._knots = this._compiledCase.knots;
      
      await this._navigator.mountPlainCase(this, this._compiledCase.knots);
      
      const knotIds = Object.keys(this._knots);
      let k = 0;
      while (k < knotIds.length && !this._knots[knotIds[k]].render)
         k++;
      
      window.messageBus.ext.publish("knot/" + knotIds[k] + "/selected");
   }
   
   /*
    * ACTION: control/knot/new (1)
    */
   async modelLoad() {
      this._resourcePicker = new DCCResourcePicker();
      this._resourcePicker.resource = "model";
      
      window.messageBus.ext.subscribe("control/model/selected", this.newKnot);
      
      const models = await window.messageBus.ext.request("model/*/get", "", "model/*");
      this._resourcePicker.addSelectList(models.message);
      this._knotPanel.appendChild(this._resourcePicker);
   }

   /*
    * ACTION: control/knot/new (2)
    */
   async newKnot(topic, message) {
      window.messageBus.ext.unsubscribe("control/model/selected", this.newKnot);
      this._knotPanel.removeChild(this._resourcePicker);
      
      const knotId = "Knot_" + this._knotGenerateCounter;
      let newKnot = {type: "knot",
                     title: "Knot " + this._knotGenerateCounter,
                     level: 1,
                     render: true,
                     _source: "# Knot " + this._knotGenerateCounter + "\n\n"};
      this._knotGenerateCounter++;
      this._knots[knotId] = newKnot;
      this._translator.extractKnotAnnotations(this._knots[knotId]);
      this._translator.compileKnotMarkdown(this._knots, knotId);
      this._htmlKnot = await this._generateHTML(knotId);
      await this._navigator.mountPlainCase(this, this._compiledCase.knots);
      window.messageBus.ext.publish("knot/" + this._knotSelected + "/selected");
   }
   
   /*
    * ACTION: control-edit
    */
   async editKnot() {
      if (this._knotSelected != null) {
         if (this._checkKnotModification())
            this._htmlKnot = await this._generateHTML(this._knotSelected);
         this._renderSlide = !this._renderSlide;
         this._renderKnot();
      }
   }
   
   /*
    * ACTION: control-save
    */
   async saveCase() {
      if (this._currentCaseName != null && this._compiledCase != null) {
         let md =this._translator.assembleMarkdown(this._compiledCase);
         const versionFile = await window.messageBus.ext.request("case/" + this._currentCaseName + "/set",
                                                                 {format: "markdown", source: md},
                                                                 "case/" + this._currentCaseName + "/version");
         
         console.log("Case saved! Previous version: " + versionFile.message);

         if (this._temporaryCase) {
            const noticeInput = new DCCNoticeInput();
            noticeInput.text = "Inform a name for your case:";
            noticeInput.input = "informed_case_name";
            this._knotPanel.appendChild(noticeInput);
            
            let status = "start";
            let caseName = null;
            while (status != "ok") {
               caseName = await window.messageBus.ext.waitMessage("var/" + noticeInput.input + "/set");
               let statusMess = await window.messageBus.ext.request("case/_temporary/rename",
                                                                    {newName: caseName.message.input},
                                                                     "case/_temporary/rename/status");
               status = statusMess.message;
               if (status != "ok")
                  noticeInput.text =
                     "<span style='color: red'>The selected name already exists</span><br>Inform a name for your case:";
            }
            this._currentCaseName = caseName.message.input;
            this._knotPanel.removeChild(noticeInput);
            this._temporaryCase = false;
         }

         this._messageSpace.innerHTML = "Saved";
         setTimeout(this._clearMessage, 2000);
         let promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve("done!"), 2000);
         });
         let result = await promise;
         this._messageSpace.innerHTML = "";
      }
   }

   /*
    * ACTION: control-play
    */
   async playCase() {
      this._messageSpace.innerHTML = "Preparing...";
      await window.messageBus.ext.request("case/" + this._currentCaseName + "/prepare",
                                          this._currentTemplateFamily,
                                          "case/" + this._currentCaseName + "/prepare/status");

      this._templateSet = {};
      
      const htmlSet = Object.assign(
                         {"entry": {render: true},
                          "signin": {render: true},
                          "register": {render: true},
                          "report": {render: true}},
                         this._knots);
      const total = Object.keys(htmlSet).length;
      let processing = 0;
      for (let kn in htmlSet) {
         processing++;
         this._messageSpace.innerHTML = "Processed: " + processing + "/" + total;
         if (htmlSet[kn].render) {
            let finalHTML = "";
            if (processing > 4)
               finalHTML = await this._generateHTMLBuffer(kn);
            else 
               finalHTML = await this._loadTemplate(this._currentTemplateFamily, kn);
            finalHTML = (htmlSet[kn].categories && htmlSet[kn].categories.indexOf("note") >= 0)
               ? AuthorManager.jsonNote.replace("{knot}", finalHTML)
               : AuthorManager.jsonKnot.replace("{knot}", finalHTML);
            
            await window.messageBus.ext.request("knot/" + kn + "/set",
                                                {caseId: this._currentCaseName,
                                                 format: "html",
                                                 source: finalHTML},
                                                "knot/" + kn + "/set/status");
            /*
            await this._server.saveKnotHTML(this._currentCaseName,
                                            kn + ".js", finalHTML);
            */
         }
      }
      this._messageSpace.innerHTML = "Finalizing...";
      
      let caseJSON = this._translator.generateCompiledJSON(this._compiledCase);
      await window.messageBus.ext.request("case/" + this._currentCaseName + "/set",
                                          {format: "json", source: caseJSON},
                                          "case/" + this._currentCaseName + "/set/status");
      
      this._messageSpace.innerHTML = "";
      
      delete this._templateSet;
      window.open("../cases/" + this._currentCaseName + "/html/index.html", "_blank");
   }
   
   /*
    * ACTION: config (1)
    */
   async config() {
      this._resourcePicker = new DCCResourcePicker();
      this._resourcePicker.resource = "template_family";
      
      window.messageBus.ext.subscribe("control/template_family/selected", this._templateFamilySelected);
      
      const families = await window.messageBus.ext.request("template_family/*/get", "", "template_family/*");
      
      this._resourcePicker.addSelectList(families.message);
      document.querySelector("#knot-panel").appendChild(this._resourcePicker);
   }

   /*
    * ACTION: config (2)
    */
   async _templateFamilySelected(topic, message) {
      window.messageBus.ext.unsubscribe("control/template_family/selected", this._templateFamilySelected);
      this._currentTemplateFamily = message.selected;
      document.querySelector("#knot-panel").removeChild(this._resourcePicker);
   }
   
   /*
    * ACTION: knot-selected
    */
   async selectKnot(topic, message) {
      if (this._miniPrevious)
         this._miniPrevious.classList.remove("sty-selected-knot");
      
      const knotId = MessageBus.extractLevel(topic, 2);
      
      const miniature = document.querySelector("#mini-" + knotId.replace(/\./g, "_"));
      miniature.classList.add("sty-selected-knot");
      
      this._miniPrevious = miniature;
            
      if (knotId != null) {
         this._checkKnotModification();
         this._knotSelected = knotId;
         this._htmlKnot = await this._generateHTML(this._knotSelected);
         this._renderKnot();
      }
    }
   
   /*
    * Check if the knot was modified to update it
    */
   _checkKnotModification() {
      let modified = false;
      if (!this._renderSlide && this._editor != null) {
         let editorText = this._editor.getText();
         editorText = editorText.substring(0, editorText.length - 1);
         if (this._knots[this._knotSelected]._source != editorText) {
            modified = true;
            this._knots[this._knotSelected]._source = editorText;
            this._translator.extractKnotAnnotations(this._knots[this._knotSelected]);
            this._translator.compileKnotMarkdown(this._knots, this._knotSelected);
         }
      }
      return modified;
   }
   
   async _generateHTML(knot) {
      this._templateSet = {};
      let finalHTML = await this._generateHTMLBuffer(knot);
      delete this._templateSet;
      return finalHTML;
   }
   
   async _generateHTMLBuffer(knot) {
      let templates = (this._knots[knot].categories) ?
                       this._knots[knot].categories : ["knot"];
      for (let tp in templates)
         if (!this._templateSet[templates[tp]]) {
            const templ = await
                    this._loadTemplate(this._currentTemplateFamily, templates[tp]);
            if (templ != "")
               this._templateSet[templates[tp]] = templ;
            else {
               if (!this._templateSet["knot"])
                  this._templateSet["knot"] = await
                     this._loadTemplate(this._currentTemplateFamily, "knot");
               this._templateSet[templates[tp]] = this._templateSet["knot"];
            }
         }
      let finalHTML = this._translator.generateKnotHTML(this._knots[knot]);
      for (let tp = templates.length-1; tp >= 0; tp--)
         finalHTML = this._templateSet[templates[tp]].replace("{knot}", finalHTML);
      
      return finalHTML;
   }
   
   async _loadTemplate(templateFamily, templateName) {
      const templateObj = await window.messageBus.ext.request(
            "template/" + templateFamily + "." + templateName + "/get", "",
            "template/" + templateFamily + "." + templateName);
      return templateObj.message;
   }
   
   _renderKnot() {
      if (this._renderSlide) {
         this._knotPanel.innerHTML = this._htmlKnot;
         
         let dccs = document.querySelectorAll("*");
         for (let d = 0; d < dccs.length; d++)
            if (dccs[d].tagName.toLowerCase().startsWith("dcc-lively-talk"))
               dccs[d].editDCC();
      } else {
         this._knotPanel.innerHTML = "<div id='editor-space'></div>";
         this._editor = new Quill('#editor-space', {
            theme: 'snow'
          });
         this._editor.insertText(0, this._knots[this._knotSelected]._source);
      }
   }
}

(function() {
   AuthorManager.jsonKnot = "(function() { PlayerManager.instance().presentKnot(`{knot}`) })();";
   AuthorManager.jsonNote = "(function() { PlayerManager.instance().presentNote(`{knot}`) })();";
   
   AuthorManager.author = new AuthorManager();
})();