/* Block DCC
 * 
 * xstyle - controls the behavior of the style
 *   * "in" or not defined -> uses the internal trigger-button style
 *   * "none" ->  apply a minimal styling (just changes cursor to pointer)
 *   * "out"  -> apply an style externally defined with the name "trigger-button-template"
**************************************************************************/

class DCCBlock extends DCCBase {
   constructor() {
     super();
     
     /*
     this._pendingRequests = 0;
     
     this.defineXstyle = this.defineXstyle.bind(this);
     this.defineLocation = this.defineLocation.bind(this);
     */

     this._renderInterface = this._renderInterface.bind(this);
   }
   
   async connectedCallback() {
      if (!this.hasAttribute("xstyle") && MessageBus.page.hasSubscriber("dcc/request/xstyle")) {
         let stylem = await MessageBus.page.request("dcc/request/xstyle");
         this.xstyle = stylem.message;
      }

      if (!this.hasAttribute("location") &&
          MessageBus.page.hasSubscriber("dcc/request/location")) {
         let locationm = await MessageBus.page.request("dcc/request/location");
         this.location = locationm.message;
      }

      if (document.readyState === "complete")
         this._renderInterface();
      else
         window.addEventListener("load", this._renderInterface);

      /*
      if (!this.hasAttribute("xstyle") && MessageBus.page.hasSubscriber("dcc/request/xstyle")) {
         MessageBus.page.subscribe("dcc/xstyle/" + this.id, this.defineXstyle);
         MessageBus.page.publish("dcc/request/xstyle", this.id);
         this._pendingRequests++;
      }
      if (!this.hasAttribute("location") &&
          MessageBus.page.hasSubscriber("dcc/request/location")) {
         MessageBus.page.subscribe("dcc/location/" + this.id, this.defineLocation);
         MessageBus.page.publish("dcc/request/location", this.id);
         this._pendingRequests++;
      }

      this._checkRender();
      */
   }

   /*
   defineXstyle(topic, message) {
      MessageBus.page.unsubscribe("dcc/xstyle/" + this.id, this.defineXstyle);
      this.xstyle = message;
      this._pendingRequests--;
      this._checkRender();
   }
   
   defineLocation(topic, message) {
      MessageBus.page.unsubscribe("dcc/location/" + this.id, this.defineLocation);
      this.location = message;
      this._pendingRequests--;
      this._checkRender();
   }
   
   _checkRender() {
      if (this._pendingRequests == 0) {
         if (document.readyState === "complete")
            this._renderInterface();
         else
            window.addEventListener("load", this._renderInterface);
      }
   }
   */
   
   /* Attribute Handling */

   static get observedAttributes() {
     return ["id", "label", "image", "location", "xstyle"];
   }

   get id() {
      return this.getAttribute("id");
   }
   
   set id(newValue) {
      this.setAttribute("id", newValue);
   }
   
   get label() {
      return this.getAttribute("label");
   }
   
   set label(newValue) {
      this.setAttribute("label", newValue);
   }
   
   get image() {
      return this.getAttribute("image");
   }
   
   set image(newValue) {
     if (this._imageElement)
        this._imageElement.src = newValue;
     this.setAttribute("image", newValue);
   }

   get location() {
      return this.getAttribute("location");
   }
    
   set location(newValue) {
     this.setAttribute("location", newValue);
   }
    
   get xstyle() {
      return this.getAttribute("xstyle");
   }
   
   set xstyle(newValue) {
      this.setAttribute("xstyle", newValue);
   }
  
   /* Rendering */
   
   elementTag() {
      return DCCBlock.elementTag;
   }
   
   _renderInterface() {
      let presentation = null;
      if (!this.hasAttribute("xstyle"))
         this.xstyle = "in";

      let render;
      switch (this.xstyle) {
         case "in"  : if (this.hasAttribute("image"))
                         render = "image-style"
                      else
                         render = "regular-style"
                      break;
         case "none": render = "";
                      break;
         case "out-image":
         case "out":  render = this.elementTag() + "-template";
                      break;
         default:     render = this.xstyle;
      }

      // console.log("* id: " + this.id);
      // console.log("* location: " + this.location);
      // console.log("* xstyle: " + this.xstyle);
      if (this.xstyle.startsWith("out") &&
          this.hasAttribute("location") && this.location != "#in") {
         presentation = document.querySelector("#" + this.location);
         this._injectDCC(presentation, render);
         let wrapper = document.querySelector("#" + this.location + "-wrapper");
         if (wrapper != null) {
            if (wrapper.style.display)  // html
               delete wrapper.style.display;
            if (wrapper.getAttribute("visibility"))  // svg
               delete wrapper.removeAttribute("visibility");
         }
      } else {
         let template = document.createElement("template");
         template.innerHTML = this._generateTemplate(render);
         
         let host = this;
         if (this.xstyle == "in" || this.xstyle == "none")
            host = this.attachShadow({mode: "open"});
         host.appendChild(template.content.cloneNode(true));
         presentation = host.querySelector("#presentation-dcc");
      }
      return presentation;
   }
   
   /*
   _computeTrigger() {
      if (this.hasAttribute("label") || this.hasAttribute("action")) {
         let eventLabel = (this.hasAttribute("action")) ? this.action : "navigate/trigger";
         let message = (this.hasAttribute("link")) ? this.link : this.label;
         MessageBus.ext.publish(eventLabel, message);
      }
   }
   */
}

(function() {
   DCCBlock.elementTag = "dcc-block";

   customElements.define(DCCBlock.elementTag, DCCBlock);

})();