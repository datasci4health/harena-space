/* DCC Rule Cell Neighbor
  ***********************/

class RuleDCCCellNeighbor extends HTMLElement {
   connectedCallback() {
      if (!this.neighbors) this.neighbors = this.innerHTML.replace(/[ \r\n]/g, "");
      this.innerHTML = "";
      const neighbors = this.neighbors;
      this._ruleNeighbors = [];
      for (let n = 0; n < neighbors.length; n++)
         if (neighbors[n] != "_")
            this._ruleNeighbors.push([Math.floor(n/3)-1, n%3-1]);

      if (!this.hasAttribute("probability")) this.probability = "100";
      this._decimalProbability = parseInt(this.probability) / 100;
      if (!this.hasAttribute("new-source")) this.newSource = "_";
      if (!this.hasAttribute("old-target")) this.oldTarget = "_";
      if (!this.hasAttribute("old-source") && this.parentNode && this.parentNode.type)
         this.oldSource = this.parentNode.type;
      if (!this.hasAttribute("new-target")) this.newTarget = this.oldSource;
      MessageBus.page.publish("dcc/rule-cell/register", this);
   }

   /* Properties
      **********/
   
   static get observedAttributes() {
      return DCCVisual.observedAttributes.concat(
         ["label", "neighbors", "probability", "old-source", "new-source", "old-target", "new-target"]);
   }

   get label() {
      return this.getAttribute("label");
   }
   
   set label(newValue) {
      this.setAttribute("label", newValue);
   }

   get neighbors() {
      return this.getAttribute("neighbors");
   }
   
   set neighbors(newValue) {
      this.setAttribute("neighbors", newValue);
   }

   get ruleNeighbors() {
      return this._ruleNeighbors;
   }

   get probability() {
      return this.getAttribute("probability");
   }

   set probability(newValue) {
      this.setAttribute("probability", newValue);
   }

   get decimalProbability() {
      return this._decimalProbability;
   }

   get oldSource() {
      return this.getAttribute("old-source");
   }
   
   set oldSource(newValue) {
      this.setAttribute("old-source", newValue);
   }

   get newSource() {
      return this.getAttribute("new-source");
   }
   
   set newSource(newValue) {
      this.setAttribute("new-source", newValue);
   }

   get oldTarget() {
      return this.getAttribute("old-target");
   }
   
   set oldTarget(newValue) {
      this.setAttribute("old-target", newValue);
   }

   get newTarget() {
      return this.getAttribute("new-target");
   }
   
   set newTarget(newValue) {
      this.setAttribute("new-target", newValue);
   }
}

(function() {
   customElements.define("rule-dcc-cell-neighbor", RuleDCCCellNeighbor);
})();