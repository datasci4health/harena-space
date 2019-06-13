/* Trigger DCC
 * 
 * xstyle - controls the behavior of the style
 *   * "in" or not defined -> uses the internal trigger-button style
 *   * "none" ->  apply a minimal styling (just changes cursor to pointer)
 *   * "out"  -> apply an style externally defined with the name "trigger-button-template"
**************************************************************************/

class DCCTrigger extends DCCBlock {
   constructor() {
     super();
     this._computeTrigger = this._computeTrigger.bind(this);
   }
   
   connectedCallback() {
      if (this.type == "+" && !this.hasAttribute("location"))
         this.location = "#in";
      super.connectedCallback();
   }
   
   /* Attribute Handling */

   static get observedAttributes() {
     return DCCBlock.observedAttributes.concat(["type", "link", "action"]);
   }

   get type() {
      return this.getAttribute("type");
   }
   
   set type(newValue) {
      this.setAttribute("type", newValue);
   }
   
   get link() {
      return this.getAttribute("link");
   }
   
   set link(newValue) {
      this.setAttribute("link", newValue);
   }
   
   get action() {
      return this.getAttribute("action");
   }
   
   set action(newValue) {
      this.setAttribute("action", newValue);
   }
  
   /* Rendering */
   
   _renderInterface() {
      // === pre presentation setup
      let html;
      if (this.xstyle.startsWith("out"))
         html = this.label;
      else {
         html = DCCTrigger.templateStyle;
         if (this.hasAttribute("image"))
            html += DCCTrigger.templateElements.image
                          .replace("[render]", this._renderStyle())
                          .replace("[label]", this.label)
                          .replace("[image]", this.image);
         else
            html += DCCTrigger.templateElements.regular
                          .replace("[render]", this._renderStyle())
                          .replace("[label]", this.label);
      }

      // === presentation setup (DCC Block)
      this._applyRender(html, (this.xstyle == "out-image") ? "title" : "innerHTML");

      // === post presentation setup
      // <TODO> provisory
      if (this.hasAttribute("image"))
         this._imageElement = this._presentation.querySelector("#pres-image-dcc");
      
      this._presentation.style.cursor = "pointer";
      if (!this.author)
         this._presentation.addEventListener("click", this._computeTrigger);
   }
   
   /* Rendering */
   
   elementTag() {
      return DCCTrigger.elementTag;
   }

   /*
   _injectDCC(presentation, render) {
      if (this.xstyle == "out")
         presentation.innerHTML = this.label;
      else
         presentation.title = this.label;

      // <TODO> provisory
      this._presentation = presentation;
   }
   
   _renderEmbeddedInterface(render, presentation) {
      if (this.xstyle == "out")  // text only
         presentation["innerHTML"] = this.label;
      else  // image (out-image)
         presentation["title"] = this.label;
   }

   _renderCompleteInterface(render, presentation) {
      let linkWeb = "";
      let elements = null;
      if (this.hasAttribute("image"))
         elements = DCCTrigger.templateElements.image.replace("[render]", render)
                                                     .replace("[link]", linkWeb)
                                                     .replace("[label]", this.label)
                                                     .replace("[image]", this.image);
      else
         elements = DCCTrigger.templateElements.regular.replace("[render]", render)
                                               .replace("[link]", linkWeb)
                                               .replace("[label]", this.label);
      
      presentation.innerHTML = DCCTrigger.templateStyle + elements;
   }
   */
   
   _computeTrigger() {
      if (this.hasAttribute("label") || this.hasAttribute("action")) {
         const message = (this.hasAttribute("link")) ? this.link : this.label;
         const topic = (this.hasAttribute("action")) ? this.action : "knot/" + message + "/navigate";
         MessageBus.ext.publish(topic, message);
      }
   }
}

(function() {
   DCCTrigger.templateStyle = 
   `<style>
      .regular-style {
         border: 1px solid lightgray;
         border-radius: 5px;
         margin: 5px;
         color: #1d1d1b;   
         padding: 14px 25px;
         text-align: center;
         text-decoration: none;
         display: inline-block;
      }
      .regular-style:hover {
         color: black;
         font-weight: bold;
         cursor: pointer;
      }
      .image-style {
         max-width: 100%;
         max-height: 100%;
         cursor: pointer;
      }
   </style>`;
      
   DCCTrigger.templateElements = {
   regular:
   `<span id='presentation-dcc' class='[render]'>[label]</span>`,
   image:
   `<span id='presentation-dcc' style='cursor:pointer'>
      <img id='pres-image-dcc' width='100%' height='100%' class='[render]' src='[image]' title='[label]'>
   </span>`
   };

   DCCTrigger.elementTag = "dcc-trigger";

   customElements.define(DCCTrigger.elementTag, DCCTrigger);

})();