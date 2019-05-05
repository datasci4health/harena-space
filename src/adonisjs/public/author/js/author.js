/*
* Main Author Environment
*
* Main authoring environment, which presents the visual interface and
* coordinates the authoring activities.
*/

class AuthorManager {
   constructor() {
      MessageBus.page = new MessageBus(false);
      
      this._knotGenerateCounter = 2;
      
      this._translator = new Translator();
      this._compiledCase = null;
      this._knots = null;
      
      this._navigator = new Navigator();
      
      this._server = new DCCAuthorServer();
      
      this._currentThemeFamily = "jacinto";
      this._currentCaseId = null;
      this._knotSelected = null;
      this._htmlKnot = null;
      this._renderSlide = true;
      this._editor = null;
      
      this.controlEvent = this.controlEvent.bind(this);
      MessageBus.ext.subscribe("control/#", this.controlEvent);
      
      this.knotSelected = this.knotSelected.bind(this);
      MessageBus.ext.subscribe("knot/+/selected", this.knotSelected);

      this.groupSelected = this.groupSelected.bind(this);
      MessageBus.ext.subscribe("group/+/selected", this.groupSelected);

      this._caseModified = false;

      window.onbeforeunload = function() {
         return (this._caseModified)
            ? "If you leave this page you will lose your unsaved changes." : null;
      }
   }
   
   async start() {
      this._navigationPanel = document.querySelector("#navigation-panel");
      this._knotPanel = document.querySelector("#knot-panel");
      this._messageSpace = document.querySelector("#message-space");

      await this.signin();

      this.caseLoadSelect();
   }

   async signin() {
      let status = "start";
      this._userid = null;
      let errorMessage = "";
      while (this._userid == null) {
         const userEmail =
            await DCCNoticeInput.displayNotice(errorMessage +
                                         "<h3>Signin</h3><h4>inform your email:</h4>",
                                         "input");
         const userPass =
            await DCCNoticeInput.displayNotice("<h3>Signin</h3><h4>inform your password:</h4>",
                                         "password");

         /*
         let userEmail = "jacinto@example.com";
         let userPass = "jacinto";
         */

         let loginReturn = await MessageBus.ext.request("data/user/login",
                                                        {email: userEmail,
                                                         password: userPass});

         this._userid = loginReturn.message.userid;
         if (this._userId == null)
            errorMessage =
               "<span style='color: red'>Invalid user and/or password.</span>";
      }
   }
   
   /*
    * Redirects control/<entity>/<operation> messages
    */
   controlEvent(topic, message) {
      switch (topic) {
         case "control/case/new":  this.caseNew();
                                   break;
         case "control/case/load": this.caseLoadSelect();
                                   break;
         case "control/case/save": this.caseSave();
                                   break;
         case "control/knot/new":  this.knotNew();
                                   break;
         case "control/knot/edit": this.knotEdit();
                                   break;
         case "control/case/play": this.casePlay();
                                   break;
         case "control/config/edit": this.config();
                                     break;
      }
   }
   
   /*
    * ACTION: control-load (1)
    */
   async caseLoadSelect() {
      const saved = await this.saveChangedCase();

      const cases = await MessageBus.ext.request("data/case/*/list",
                                                 {filterBy: "user",
                                                  filter: this._userid});
      const caseId = await DCCNoticeInput.displayNotice(
         "Select a case to load or start a new case.",
         "list", "Select", "New", cases.message);
      /*
      if (this._temporaryCase && saved == "No")
         console.log("deleting..." + this._currentCaseId);
      */

      console.log("Selected: " + caseId);
      if (caseId == "New")
         this.caseNew();
      else
         this._caseLoad(caseId);
   }
   
   async saveChangedCase() {
      let decision = "No";

      if (this._caseModified) {
         decision = await DCCNoticeInput.displayNotice(
            "There are unsaved modifications in the case. Do you want to save?",
            "message", "Yes", "No");
         if (decision == "Yes")
            await this.caseSave();
      }

      return decision;
   }

   /*
    * ACTION: control-new
    */
   async caseNew() {
      this._temporaryCase = true;
      const caseId = await MessageBus.ext.request("data/case//new");

      const blankMd =
         await MessageBus.ext.request("data/template/basic.blank/get");

      const status = await MessageBus.ext.request("data/case/" + caseId.message + "/set",
                                                  {format: "markdown", source: blankMd.message});

      this._caseLoad(caseId.message);
   }

   /*
    * ACTION: control-load (2)
    */
   async _caseLoad(caseId) {
      this._currentCaseId = caseId;
      const caseObj = await MessageBus.ext.request(
         "data/case/" + this._currentCaseId + "/get");
      this._currentCaseName = caseObj.message.name;

      this._compiledCase = this._translator.compileMarkdown(this._currentCaseId,
                                                            caseObj.message.source);
      this._knots = this._compiledCase.knots;

      console.log(this._compiledCase);

      await this._navigator.mountTreeCase(this, this._compiledCase.knots);
      
      const knotIds = Object.keys(this._knots);
      let k = 0;
      while (k < knotIds.length && !this._knots[knotIds[k]].render)
         k++;
      
      MessageBus.ext.publish("knot/" + knotIds[k] + "/selected");
   }
   
   /*
    * ACTION: control-save
    */
   async caseSave() {
      if (this._currentCaseId != null && this._compiledCase != null) {
         if (this._temporaryCase) {
            const caseName =
               await DCCNoticeInput.displayNotice("Inform a name for your case:",
                                                  "input");
            this._currentCaseName = caseName;
            this._temporaryCase = false;
         }

         let md =this._translator.assembleMarkdown(this._compiledCase);
         const status = await MessageBus.ext.request("data/case/" + this._currentCaseId + "/set",
                                                     {name: this._currentCaseName,
                                                      format: "markdown",
                                                      source: md});
         
         console.log("Case saved! Status: " + status.message);

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
    * ACTION: control/knot/new
    */
   async knotNew() {
      const templates = await MessageBus.ext.request("data/template/*/list");
      const template = await DCCNoticeInput.displayNotice(
         "Select a template for your knot.",
         "list", "Select", "Cancel", templates.message);
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
      MessageBus.ext.publish("knot/" + this._knotSelected + "/selected");
   }
   
   /*
    * ACTION: control-edit
    */
   async knotEdit() {
      if (this._knotSelected != null) {
         if (this._checkKnotModification())
            this._htmlKnot = await this._generateHTML(this._knotSelected);
         this._renderSlide = !this._renderSlide;
         this._renderKnot();
      }
   }
   
   /*
    * ACTION: control-play
    */
   async casePlay() {
      this._messageSpace.innerHTML = "Preparing...";
      const dirPlay = await MessageBus.ext.request(
                         "case/" + this._currentCaseId + "/prepare",
                         this._currentThemeFamily,
                         "case/" + this._currentCaseId + "/prepare/directory");
      this._themeSet = {};
      
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
               finalHTML = await this._loadTheme(this._currentThemeFamily, kn);
            finalHTML = (htmlSet[kn].categories && htmlSet[kn].categories.indexOf("note") >= 0)
               ? AuthorManager.jsonNote.replace("{knot}", finalHTML)
               : AuthorManager.jsonKnot.replace("{knot}", finalHTML);
            
            await MessageBus.ext.request("knot/" + kn + "/set",
                                                {caseId: this._currentCaseId,
                                                 format: "html",
                                                 source: finalHTML},
                                                "knot/" + kn + "/set/status");
         }
      }
      this._messageSpace.innerHTML = "Finalizing...";
      
      let caseJSON = this._translator.generateCompiledJSON(this._compiledCase);
      await MessageBus.ext.request("case/" + this._currentCaseId + "/set",
                                          {format: "json", source: caseJSON},
                                          "case/" + this._currentCaseId + "/set/status");
      
      this._messageSpace.innerHTML = "";
      
      delete this._themeSet;
      window.open(dirPlay.message + "/html/index.html", "_blank");
   }
   
   /*
    * ACTION: config
    */
   async config() {
      const families = await MessageBus.ext.request("data/theme_family/*/list");
      this._currentThemeFamily = await DCCNoticeInput.displayNotice(
         "Select a theme to be applied.",
         "list", "Select", "Cancel", families.message);
   }
   
   /*
    * ACTION: knot-selected
    */
   async knotSelected(topic, message) {
      if (this._miniPrevious)
         this._miniPrevious.classList.remove("sty-selected-knot");
      
      const knotid = MessageBus.extractLevel(topic, 2);
      
      const miniature = document.querySelector("#mini-" + knotid.replace(/\./g, "_"));
      miniature.classList.add("sty-selected-knot");
      
      this._miniPrevious = miniature;
            
      if (knotid != null) {
         this._checkKnotModification();
         this._knotSelected = knotid;
         this._htmlKnot = await this._generateHTML(this._knotSelected);
         this._renderKnot();
      }
    }
   
    /*
     * ACTION: group-selected
     */
    async groupSelected(topic, message) {
      this.knotSelected(topic, message);
      const knotid = MessageBus.extractLevel(topic, 2);
      this._navigator.downTree(knotid);
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
      if (!this._caseModified)
        this._caseModified = modified;
      return modified;
   }
   
   async _generateHTML(knot) {
      this._themeSet = {};
      let finalHTML = await this._generateHTMLBuffer(knot);
      // <TODO> fix - deleting before ending
      // delete this._themeSet;
      return finalHTML;
   }
   
   async _generateHTMLBuffer(knot) {
      let themes = (this._knots[knot].categories) ?
                       this._knots[knot].categories : ["knot"];
      for (let tp in themes)
         if (!this._themeSet[themes[tp]]) {
            const templ = await
                    this._loadTheme(this._currentThemeFamily, themes[tp]);
            if (templ != "")
               this._themeSet[themes[tp]] = templ;
            else {
               if (!this._themeSet["knot"])
                  this._themeSet["knot"] = await
                     this._loadTheme(this._currentThemeFamily, "knot");
               this._themeSet[themes[tp]] = this._themeSet["knot"];
            }
         }
      let finalHTML = this._translator.generateKnotHTML(this._knots[knot]);
      for (let tp = themes.length-1; tp >= 0; tp--)
         finalHTML = this._themeSet[themes[tp]].replace("{knot}", finalHTML);
      
      return finalHTML;
   }
   
   async _loadTheme(themeFamily, themeName) {
      const themeObj = await MessageBus.ext.request(
            "data/theme/" + themeFamily + "." + themeName + "/get");
      return themeObj.message;
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