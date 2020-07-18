/* Graph DCC
  **********/
class DCCGraph extends DCCVisual {
   constructor() {
      super();
   }

   connectedCallback() {
      if (!this.hasAttribute("width"))
         this.width = 300;
      if (!this.hasAttribute("height"))
         this.height = 200;

      let html = DCCGraph.svgTemplate
         .replace(/\[css\]/g,
            Basic.service.themeStyleResolver("dcc-graph.css"))
         .replace(/\[width-div\]/g, this.width + "px")
         .replace(/\[height-div\]/g, this.height + "px")
         .replace(/\[width\]/g, this.width)
         .replace(/\[height\]/g, this.height);

      this._graph = new Graph(this, this.layout);
      this._presentation = this._shadowHTML(html);
      this._presentation.appendChild(this._graph.presentation);
      super.connectedCallback();
      this._presentationIsReady();
   }

   /* Observed Properties
      *******************/
   
   static get observedAttributes() {
      return DCCVisual.observedAttributes.concat(
         ["width", "height", "layout"]);
   }

   get width() {
      return this.getAttribute("width");
   }

   set width(newValue) {
      this.setAttribute("width", newValue);
   }

   get height() {
      return this.getAttribute("height");
   }

   set height(newValue) {
      this.setAttribute("height", newValue);
   }

   get layout() {
      return this.getAttribute("layout");
   }

   set layout(newValue) {
      this.setAttribute("layout", newValue);
   }

   /* Non-observed Properties
      ***********************/

   get graph() {
      return this._graph;
   }

   get graphWidth() {
      return this._presentation.getAttribute("width");
   }

   set graphWidth(newValue) {
      this._presentation.setAttribute("width", newValue);
   }

   get graphHeight() {
      return this._presentation.getAttribute("height");
   }

   set graphHeight(newValue) {
      this._presentation.setAttribute("height", newValue);
   }

   /*****/

   addPiece(type, piece) {
      this._graph.addPiece(type, piece);
   }
}

/* Auto-organize a graph in a layout
 ***********************************/
class DCCGraphLayout {
   static create(layout) {
      let layoutObj = null;
      if (layout == null)
         layout = "dg";
      switch (layout) {
         case "dg": layoutObj = new DCCGraphLayoutDG();
                    break;
      }
      return layoutObj;
   }

   attach(graph) {
      this._graph = graph;
   }
}

/* Directed Graph Auto-organizer
 *******************************/
class DCCGraphLayoutDG extends DCCGraphLayout {
   organize() {
      let param = {subgraphs: DCCGraphLayoutDG.parameters["subgraphs"],
                   width: DCCGraphLayoutDG.parameters["node-width"],
                   height: DCCGraphLayoutDG.parameters["node-height"],
                   hmargin: DCCGraphLayoutDG.parameters["horizontal-margin"],
                   vmargin: DCCGraphLayoutDG.parameters["vertical-margin"],
                   hspace: DCCGraphLayoutDG.parameters["node-horizontal-spacing"],
                   vspace: DCCGraphLayoutDG.parameters["node-vertical-spacing"]};
      for (let node of this._graph.nodes)
         node.level = -1;
      let proximo = this._graph.nodes[0];
      let shiftX = 0,
          shiftY = 0,
          maxX = 0,
          maxY = 0;
      do {
         let dim = this._visit(proximo, 0, shiftX, shiftY, param);
         if (param.subgraphs == "horizontal") {
            shiftX += dim.horizontal;
            maxX = shiftX;
            shiftY = 0;
            maxY = (maxY < dim.vertical) ? dim.vertical : maxY;
         }
         else {
            shiftX = 0;
            maxX = (maxX < dim.horizontal) ? dim.horizontal : maxX;
            shiftY += dim.vertical;
            maxY = shiftY;
         }
         proximo = this._graph.nodes.find(node => node.level == -1);
      } while (proximo != null);

      this._graph.width = maxX + param.hmargin;
      this._graph.height = maxY + param.vmargin;

      for (let edge of this._graph.edges)
         edge.update();
   }

   _visit(node, level, shiftX, shiftY, param) {
      node.level = level;
      if (node.width == null)
         node.width = param.width;
      if (node.height == null)
         node.height = param.height;
      const children =
         this._graph.edges.filter(edge => edge.source == node);
      let horizontal = node.width + param.hspace,
          vertical = node.height + param.vspace;
      let cHorizontal = 0,
          cVertical = 0;
      if (children.length > 0) {
         for (let ch of children) {
            let dim = this._visit(
               ch.target, level + 1,
               shiftX + cHorizontal, shiftY + vertical, param);
            cHorizontal += dim.horizontal;
            cVertical =
               (cVertical < dim.vertical) ? dim.vertical : cVertical;
         }
      }
      node.x = param.hmargin + shiftX;
      if (horizontal < cHorizontal) {
         node.x += (cHorizontal - horizontal) / 2;
         horizontal = cHorizontal;
      }
      node.y = param.vmargin + shiftY;
      return {horizontal: horizontal, vertical: vertical + cVertical};
   }
}

/* Any Graph Piece (e.g., Node and Edge)
 ***************************************/
class DCCGraphPiece extends DCCVisual {
   connectedCallback() {
      this._space = (this.hasAttribute("space"))
         ? document.querySelector("#" + this.space) : this.parentNode;
      super.connectedCallback();
   }   

   /* Properties
      **********/

   get presentation() {
      return (this._presentation) ? this._presentation : null;
   }
   
   /* Observed Properties
      *******************/

   static get observedAttributes() {
      return DCCVisual.observedAttributes.concat(
         ["id", "label", "space"]);
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

   get space() {
      return this.getAttribute("space");
   }
   
   set space(newValue) {
      this.setAttribute("space", newValue);
   }
}

/* Graph Node DCC
  ***************/
class DCCNode extends DCCGraphPiece {
   connectedCallback() {
      super.connectedCallback();

      let prenode = {
         x: this.x,
         y: this.y,
         width: this.width,
         height: this.height,
         label: this.label
      };
      if (this.hasAttribute("id"))
         prenode.id = this.id;
      this._node = new GraphNode(prenode);

      this._presentation = this._node.presentation;
      this._space.addPiece("node", this._node);
      this._presentationIsReady();
   }

   /* Properties
      **********/
   
   static get observedAttributes() {
      return DCCGraphPiece.observedAttributes.concat(
         ["x", "y", "width", "height"]);
   }

   get x() {
      return this.getAttribute("x");
   }

   set x(newValue) {
      this.setAttribute("x", newValue);
   }

   get y() {
      return this.getAttribute("y");
   }
   
   set y(newValue) {
      this.setAttribute("y", newValue);
   }

   get width() {
      return this.getAttribute("width");
   }

   set width(newValue) {
      this.setAttribute("width", newValue);
   }

   get height() {
      return this.getAttribute("height");
   }
   
   set height(newValue) {
      this.setAttribute("height", newValue);
   }

   /*****/

   get graph() {
      return this._node.graph;
   }

   addPiece(type, piece) {
      if (this._node.graph == null)
         this._node.graph =
            new Graph(this._node, this._space.layout);
      this._node.graph.addPiece(type, piece);
   }
}

/* Graph Edge DCC
  ***************/
class DCCEdge extends DCCGraphPiece {
   connectedCallback() {
      super.connectedCallback();

      if (this._space != null &&
          this.hasAttribute("source") && this.hasAttribute("target")) {
         let edge = new GraphEdge({
            source: this.source,
            target: this.target,
            label: this.label
         }, this._space.graph);

         this._presentation = edge.presentation;
         this._space.addPiece("edge", edge);
         this._presentationIsReady();
      }
   }

   /* Properties
      **********/
   
   static get observedAttributes() {
      return DCCGraphPiece.observedAttributes.concat(
         ["source", "target"]);
   }

   get source() {
      return this.getAttribute("source");
   }

   set source(newValue) {
      this.setAttribute("source", newValue);
   }

   get target() {
      return this.getAttribute("target");
   }
   
   set target(newValue) {
      this.setAttribute("target", newValue);
   }
}

/* The root of an SVG graph
 **************************/

class Graph {
   constructor(container, layout) {
      this._container = container;
      this._nodes = [];
      this._edges = [];

      this._presentation =
         document.createElementNS("http://www.w3.org/2000/svg", "g");

      this._layout = DCCGraphLayout.create(layout);
      this._layout.attach(this);
   }

   get width() {
      return this._container.graphWidth;
   }

   set width(newValue) {
      this._container.graphWidth = newValue;
   }

   get height() {
      return this._container.graphHeight;
   }

   set height(newValue) {
      this._container.graphHeight = newValue;
   }

   get nodes() {
      return this._nodes;
   }

   get edges() {
      return this._edges;
   }

   addPiece(type, piece) {
      this["_" + type + "s"].push(piece);
      if (piece.presentation != null)
         this._presentation.appendChild(piece.presentation);
      if (this._layout != null)
         this._layout.organize();
   }

   get presentation() {
      return this._presentation;
   }
}

/* A node in an SVG graph
 ************************/
class GraphNode {
   constructor(node) {
      this._node = {};
      Object.assign(this._node, node);

      this._rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      this._rect.setAttribute("rx", 10);
      this._setDimensions(this._rect);
      this._rect.classList.add("dcc-node-theme");

      this._presentation =
         document.createElementNS("http://www.w3.org/2000/svg", "g");
      this._presentation.appendChild(this._rect);

      if (node.label != null) {
         this._contentSpace = document.createElementNS(
            "http://www.w3.org/2000/svg", "foreignObject");
         this._setDimensions(this._contentSpace);
         this._label = document.createElement("div");
         this._label.classList.add("dcc-node-label-theme");
         this._label.style = "width:" + this._node.width +
                             "px;height:" + this._node.height + "px";
         this._label.innerHTML = "<div>" + node.label + "</div>";
         this._contentSpace.appendChild(this._label);
         this._presentation.appendChild(this._contentSpace);
      }

      this._setPosition();
   }

   get id() {
      return this._node.id;
   }

   get x() {
      return this._node.x;
   }

   set x(newValue) {
      this._node.x = newValue;
      this._setPosition();
   }

   get y() {
      return this._node.y;
   }

   set y(newValue) {
      this._node.y = newValue;
      this._setPosition();
   }

   get width() {
      return this._node.width;
   }

   set width(newValue) {
      this._graphAttr("width", newValue);
   }

   get height() {
      return this._node.height;
   }

   set height(newValue) {
      this._graphAttr("height", newValue);
   }

   get graph() {
      return this._graph;
   }

   set graph(newValue) {
      if (this._graph != null)
         this._presentation.removeChild(this._graph.presentation);
      this._graph = newValue;
      this._presentation.appendChild(this._graph.presentation);
   }

   get graphWidth() {
      return this._node.width;
   }

   set graphWidth(newValue) {
      this._graphAttr("width", newValue);
   }

   get graphHeight() {
      return this._node.height;
   }

   set graphHeight(newValue) {
      this._graphAttr("height", newValue);
   }

   get presentation() {
      return this._presentation;
   }

   _graphAttr(attr, value) {
      this._node[attr] = value;
      this._rect.setAttribute(attr, value);
      if (this._contentSpace != null) {
         this._contentSpace.setAttribute(attr, value);
         this._label.style = "width:" + this._node.width +
                             "px;height:" + this._node.height + "px";
      }
   }

   _setPosition() {
      this._presentation.setAttribute("transform",
         "translate(" +
         ((this.x != null) ? this.x : GraphNode.standardDimensions.x) + " " +
         ((this.y != null) ? this.y : GraphNode.standardDimensions.y) + ")");
   }

   _setDimensions(element) {
      element.setAttribute("width",
         (this.width != null) ? this.width : GraphNode.standardDimensions.width);
      element.setAttribute("height",
         (this.height != null) ? this.height : GraphNode.standardDimensions.height);
   }

   addPiece(type, piece) {
      if (this._graph != null)
         this._graph.addPiece(type, piece);
   }
}

/* An edge in an SVG graph
 *************************/
class GraphEdge {
   constructor(edge, graph) {
      if (graph != null && edge.source && edge.target) {
         const source = graph.nodes.find(node => node.id == edge.source);
         const target = graph.nodes.find(node => node.id == edge.target);

         if (source != null && target != null) {
            edge.source = source;
            edge.target = target;
            this._edge = {};
            Object.assign(this._edge, edge);

            this._presentation =
               document.createElementNS("http://www.w3.org/2000/svg", "g");

            this._line = document.createElementNS(
               "http://www.w3.org/2000/svg", "line");
            this._line.classList.add("dcc-edge-theme");
            this._presentation.appendChild(this._line);

            if (edge.label != null) {
               this._labelText = document.createTextNode(edge.label);
               this._label = document.createElementNS(
                  "http://www.w3.org/2000/svg", "text");
               this._label.appendChild(this._labelText);
               this._presentation.appendChild(this._label);
            }

            this.update();
         }
      }
   }

   get source() {
      return this._edge.source;
   }

   get target() {
      return this._edge.target;
   }

   get presentation() {
      return this._presentation;
   }

   update() {
      const source = this._edge.source,
            target = this._edge.target;
      const x1 = source.x + source.width / 2,
            y1 = source.y + source.height,
            x2 = target.x + target.width / 2,
            y2 = target.y;
      this._line.setAttribute("x1", x1);
      this._line.setAttribute("y1", y1);
      this._line.setAttribute("x2", x2);
      this._line.setAttribute("y2", y2);

      if (this._label != null) {
         this._label.setAttribute("x", (x1 + x2) / 2);
         this._label.setAttribute("y", (y1 + y2) / 2);
         this._labelText.nodeValue = this._edge.label;
      }
   }
}

(function() {
customElements.define("dcc-graph", DCCGraph);
customElements.define("dcc-node", DCCNode);
customElements.define("dcc-edge", DCCEdge);

DCCGraph.svgTemplate =
`<style>@import "[css]"</style>
<div id="grid-wrapper" style="overflow:scroll;width:[width-div];height:[height-div]">
<svg id="presentation-dcc" width="[width]" height="[height]" xmlns="http://www.w3.org/2000/svg">
</svg>
</div>`;

DCCGraphLayoutDG.parameters = {
   "subgraphs": "vertical",
   "node-width": 100,
   "node-height": 50,
   "node-horizontal-spacing": 10,
   "node-vertical-spacing": 30,
   "horizontal-margin": 10,
   "vertical-margin": 10
};

GraphNode.standardDimensions = {
   x: 0,
   y: 0,
   width: 100,
   height: 50
};
})();