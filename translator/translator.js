/**
 * Translator of Case Notebooks
 * 
 * Translates case notebook narratives (extension of markdown) to object representations and further to HTML.
 */
class Translator {
   
   constructor() {
      this._markdownTranslator = new showdown.Converter();
      
      this._annotationMdToObj = this._annotationMdToObj.bind(this);
      this._textObjToHTML = this._textObjToHTML.bind(this);
   }

   /*
    * Compiles a markdown text to an object representation
    */
   compileMarkdown(caseId, markdown) {
      let compiledCase = this._indexKnots(caseId, markdown);
      
      for (let kn in compiledCase.knots) {
         this.extractKnotAnnotations(compiledCase.knots[kn]);
         this.compileKnotMarkdown(compiledCase.knots, kn);
      }
      
      return compiledCase;
   }
      
   /*
    * Index all knots to guide references
    */
   _indexKnots(caseId, markdown) {
      let compiledCase = {
         id:    caseId,
         knots: {}
      };
      
      let knotCtx = [];
      let knotBlocks = markdown.split(Translator.marksKnotTitle);
      for (var kb = 1; kb < knotBlocks.length; kb += 2) {
         let transObj = this._knotMdToObj(knotBlocks[kb].match(Translator.marks.knot));
         transObj.render = true;
         let label = transObj.title;
         // console.log("Label: " + label);
         if (transObj.level == 1)
            knotCtx[0] = {label: label, obj: transObj};
         else {
            let upper = -1;
            for (let l = transObj.level-2; l >=0 && upper == -1; l--)
               if (knotCtx[l] != null)
                  upper = l;
            
            if (upper != -1) {
               label = knotCtx[upper].label + "." + label;
               knotCtx[upper].obj.render = false;
            }
            knotCtx[transObj.level-1] = {label: label, obj: transObj};
         }
         let knotId = label.replace(/ /g, "_");
         if (kb == 1)
            compiledCase.start = knotId;
         else if (transObj.categories && transObj.categories.indexOf("start") >= 0)
            compiledCase.start = knotId;
         if (compiledCase.knots[knotId]) {
            if (!compiledCase._error)
               compiledCase._error = [];
            compiledCase._error.push("Duplicate knots title: " + label);
         } else {
            transObj._source = knotBlocks[kb] + knotBlocks[kb+1];
            compiledCase.knots[knotId] = transObj;
         }
      }
      return compiledCase;
   }
   
   /*
    * Extract annotations of a single node
    */
   extractKnotAnnotations(knot) {
      const mdAnnToObj = {
         ctxopen   : this._contextOpenMdToObj,
         ctxclose  : this._contextCloseMdToObj,
         annotation: this._annotationMdToObj
      };
      
      knot.annotations = [];
      let currentSet = knot.annotations;
      let maintainContext = false;

      let mdfocus = knot._source;
      
      let newSource = "";
      let matchStart;
      do {
         // look for the next nearest expression match
         matchStart = -1;
         let selected = "";
         for (let mk in Translator.marksAnnotation) {
            let pos = mdfocus.search(Translator.marksAnnotation[mk]);
            if (pos > -1 && (matchStart == -1 || pos < matchStart)) {
               selected = mk;
               matchStart = pos;
            }
         }
         
         if (matchStart > -1) {
            // add a segment that does not match to any expression
            if (matchStart > 0)
               newSource += mdfocus.substring(0, matchStart);
            
            // translate the expression to an object
            let matchSize = mdfocus.match(Translator.marksAnnotation[selected])[0].length;
            let toTranslate = mdfocus.substr(matchStart, matchSize);
            let transObj = mdAnnToObj[selected](
                  Translator.marksAnnotation[selected].exec(toTranslate));
            
            // hierarchical annotation building inside contexts
            switch (selected) {
               case "ctxopen":
                  currentSet.push(transObj);
                  currentSet = [];
                  transObj.annotations = currentSet;
                  if (toTranslate.indexOf("#") > -1) {
                     newSource += toTranslate;
                     maintainContext = true;
                  }
                  break;
               case "ctxclose":
                  // currentSet = knotSet;
                  currentSet = knot.annotations;
                  if (maintainContext)
                     newSource += toTranslate;
                  maintainContext = false;
                  break;
               case "annotation":
                  currentSet.push(transObj);
                  if (toTranslate.indexOf("#") > -1)
                     newSource += toTranslate;
                  else
                     newSource += transObj.natural.complete;
                  break;
            }
            
            if (matchStart + matchSize >= mdfocus.length)
               matchStart = -1;
            else
               mdfocus = mdfocus.substring(matchStart + matchSize);
         }
      } while (matchStart > -1);
      if (mdfocus.length > 0)
         newSource += mdfocus;
      
      knot._preparedSource = newSource;
   }
   
   /*
    * Compiles a single knot to an object representation
    */
   compileKnotMarkdown(knotSet, knotId) {
      const mdToObj = {
            knot   : this._knotMdToObj,
            option : this._optionMdToObj,
            divert : this._divertMdToObj,
            talk     : this._talkMdToObj,
            talkopen : this._talkopenMdToObj,
            talkclose: this._talkcloseMdToObj,
            // image  : this.image,
            input  : this._inputMdToObj,
            selctxopen  : this._selctxopenMdToObj,
            selctxclose : this._selctxcloseMdToObj,
            selector    : this._selectorMdToObj
            // annotation : this.annotationMdToObj
            // score  : this.translateScore
      };
      
      let knot = knotSet[knotId];
      
      if (knot.categories)
         delete knot.categories;
      
      let mdfocus = knot._preparedSource;
      knot.content = [];
      let compiledKnot = knot.content;
      
      this._objSequence = 0;
      
      let matchStart;
      do {
         // look for the next nearest expression match
         matchStart = -1;
         let selected = "";
         for (let mk in Translator.marks) {
            let pos = mdfocus.search(Translator.marks[mk]);
            if (pos > -1 && (matchStart == -1 || pos < matchStart)) {
               selected = mk;
               matchStart = pos;
            }
         }

         if (matchStart > -1) {
            // add a segment that does not match to any expression as type="text"
            if (matchStart > 0)
               compiledKnot.push(this._stampObject(
                  this._textMdToObj(mdfocus.substring(0, matchStart))));
            
            // translate the expression to an object
            let matchSize = mdfocus.match(Translator.marks[selected])[0].length;
            let toTranslate = mdfocus.substr(matchStart, matchSize);
            let transObj = this._stampObject( 
               mdToObj[selected](Translator.marks[selected].exec(toTranslate)));
            
            // attach to a knot array (if it is a knot) or an array inside a knot
            if (selected == "knot") {
               if (transObj.categories)
                  knot.categories = transObj.categories;
            } else
               compiledKnot.push(transObj);
            
            if (matchStart + matchSize >= mdfocus.length) {
               matchStart = -1;
               mdfocus = "";
            } else
               mdfocus = mdfocus.substring(matchStart + matchSize);
         }
      } while (matchStart > -1);
      if (mdfocus.length > 0)
         compiledKnot.push(this._stampObject(this._textMdToObj(mdfocus)));
      
      // giving context to links and variables
      for (let c in compiledKnot) {
         if (compiledKnot[c].type == "input")
            compiledKnot[c].variable = knotId + "." + compiledKnot[c].variable;
         else if (compiledKnot[c].type == "context-open")
            compiledKnot[c].context = knotId + "." + compiledKnot[c].context;
         else if (compiledKnot[c].type == "option" || compiledKnot[c].type == "divert") {
            /*
            let target = (compiledKnot[c].target != null)
                            ? compiledKnot[c].target : compiledKnot[c].label;
            */
            let target = compiledKnot[c].target.replace(/ /g, "_");
            let prefix = knotId;
            let lastDot = prefix.lastIndexOf(".");
            while (lastDot > -1) {
               prefix = prefix.substring(0, lastDot);
               if (knotSet[prefix + "." + target])
                  target = prefix + "." + target;
               lastDot = prefix.lastIndexOf(".");
            }
            compiledKnot[c].target = target;
         }  
      }
      
      delete knot._preparedSource;
   }
   
   /*
    * Produce a sequential stamp to uniquely identify each recognized object
    */
   _stampObject(obj) {
      this._objSequence++;
      obj.seq = this._objSequence;
      return obj;
   }

   /*
    * Generate HTML in a single knot
    */
   generateKnotHTML(knotObj) {
      const objToHTML = {
            // knot   : 
            text   : this._textObjToHTML,
            option : this._optionObjToHTML,
            divert : this._divertObjToHTML,
            talk        : this._talkObjToHTML,
            "talk-open" : this._talkopenObjToHTML,
            "talk-close": this._talkcloseObjToHTML,
            // image  : this.image,
            input  : this._inputObjToHTML,
            "context-open"  : this._selctxopenObjToHTML,
            "context-close" : this._selctxcloseObjToHTML,
            selector   : this._selectorObjToHTML,
            annotation : this._annotationObjToHTML
            // score  : this.translateScore
      };

      let preDoc = "";
      let html = "";
      if (knotObj != null && knotObj.content != null) {
         // produces a pretext with object slots to process markdown
         for (let kc in knotObj.content)
            preDoc += (knotObj.content[kc].type == "text" ||
                       knotObj.content[kc].type == "context-open" ||
                       knotObj.content[kc].type == "context-close") 
               ? objToHTML[knotObj.content[kc].type](knotObj.content[kc])
               : "@@" + knotObj.content[kc].seq + "@@";
               
         // converts to HTML
         html = this._markdownTranslator.makeHtml(preDoc);

         // replaces the marks
         let current = 0;
         let next = html.indexOf("@@");
         while (next != -1) {
            let end = html.indexOf("@@", next+1);
            let seq = parseInt(html.substring(next+2, end));
            while (knotObj.content[current].seq < seq)
               current++;
            if (knotObj.content[current].seq != seq)
               console.log("Error in finding seq.");
            else
               html = html.substring(0, next) +
                      objToHTML[knotObj.content[current].type](knotObj.content[current]) +
                      html.substring(end+2);
            next = html.indexOf("@@");
         }
         
         html = html.replace(Translator.contextHTML.open, this._contextSelectorHTMLAdjust);
         html = html.replace(Translator.contextHTML.close, this._contextSelectorHTMLAdjust);
      }
      return html;
   }
   
   generateCompiledJSON(compiledCase) {
      return "(function() { DCCPlayerServer.playerObj =" +
             JSON.stringify(compiledCase) + "})();"; 
   }
   
   /*
    * Put together all source fragments
    */
   assembleMarkdown(compiledCase) {
      let md = "";
      for (let kn in compiledCase.knots)
         md += compiledCase.knots[kn]._source;
      return md;
   }
   
   /*
    * Adjusts the HTML generated to avoid trapping the constext selector tag in a paragraph
    */
   _contextSelectorHTMLAdjust(matchStr, insideP) {
      return insideP;
   }
   
   /*
    * Knot Md to Obj
    * Input: ## [title] ([category],..,[category]) ##
    *        or
    *        [title] ([category],..,[category])
    *        =====
    * Output:
    * {
    *    type: "knot"
    *    title: <title of the knot> #2 or #4
    *    categories: [<set of categories>]  #3 or #5
    *    level: <level of the knot> #1 or #6
    *    content: [<sub-nodes>] - generated in further routines
    * }
    */
   _knotMdToObj(matchArray) {
      let knot = {
         type: "knot"
      };
      
      if (matchArray[2] != null)
         knot.title = matchArray[2].trim();
      else
         knot.title = matchArray[4].trim();
      
      if (matchArray[3] != null)
         knot.categories = matchArray[3].trim().split(",");
      else if (matchArray[5] != null)
         knot.categories = matchArray[5].trim().split(",");
      
      if (knot.categories != null)
         for (let sc in Translator.specialCategories) {
            let cat = knot.categories.indexOf(Translator.specialCategories[sc]);
            if (cat >= 0) {
               let category = knot.categories[cat];
               knot.categories.splice(cat, 1);
               knot.categories.unshift(category);
            }
         }
      
      if (matchArray[1] != null)
         knot.level = matchArray[1].trim().length;
      else
         if (matchArray[6][0] == "=")
            knot.level = 1;
         else
            knot.level = 2;
         
      return knot;
   }
   
   /*
    * Text Md to Obj
    * Output:
    * {
    *    type: "text"
    *    content: <unprocessed content in markdown>
    * }
    */
   _textMdToObj(markdown) {
      return {
         type: "text",
         content: markdown
      };
   }
   
   /*
    * Context Open Md to Obj
    * Input: {{ [context] #[evaluation]: [option-1], ..., [option-n]
    * Expression: \{\{([\w \t\+\-\*"=\:%\/]+)(?:#([\w \t\+\-\*"=\%\/]+):([\w \t\+\-\*"=\%\/,]+))?[\f\n\r]
    * Output: {
    *    type: "context"
    *    context: <identification of the context>
    *    evaluation: <characteristic being evaluated in the context - for selector>
    *    options: <set of options>
    *    annotations: [<set of annotations in this context>]
    * }
    */
   _contextOpenMdToObj(matchArray) {
      let context = {
         type: "context",
         context: matchArray[1].trim(),
      };
      
      if (matchArray[2] != null) {
         context.evaluation = matchArray[2].trim();
         context.options = matchArray[3];
      }
     
      return context;
   }

   /*
    * Context Close Md to Obj
    * Input: }}
    * Expression: \}\}
    * Output: {}
    */
   _contextCloseMdToObj(matchArray) {
   }   
   
   /*
    * Annotation Md to Obj
    * Input outside: { [natural] ([formal]) #[context value] }
    * Expression outside: \{([\w \t\+\-\*"=\:%\/]+)\}(?:\(([\w \t\+\-\*"=\:%\/]+)\))?(?!\/)
    * Output: {
    *    type: "annotation"
    *    natural: {  #1
    *       complete: <complete text in natural language>
    *       expression: <expression in the text to be evaluated>
    *       specification: <specify the expression defining, for example, a measurable value, rate or origin>
    *       rate: <compose the rate of the specification>
    *    }
    *    formal: {   #2
    *       complete: <complete text written in formal way to be recognized against a dictionary>
    *       expression: <expression in the text to be evaluated>
    *       specification: <specify the expression defining, for example, a measurable value, rate or origin>
    *       rate: <compose the rate of the specification>
    *    }
    * }
    */
   _annotationMdToObj(matchArray) {
      let annotation = {
         type: "annotation",
         natural: this._annotationInsideMdToObj(
                     Translator.marksAnnotationInside.exec(matchArray[1].trim()))
      };
      
      if (matchArray[2] != null)
         annotation.formal = this._annotationInsideMdToObj(
            Translator.marksAnnotationInside.exec(matchArray[2].trim()));
      
      if (matchArray[3] != null)
         annotation.value = matchArray[3].trim();
     
      return annotation;
   }
   
   /*
    * Annotation Inside Md to Obj
    * Input inside: [expression] =|: [specification] / [rate]
    * Expression inside: ([\w \t\+\-\*"]+)(?:[=\:]([\w \t%]*)(?:\/([\w \t%]*))?)?
    * Output: {
    *    complete: <complete text> #0
    *    expression: <expression in the text to be evaluated> #1
    *    specification: <specify the expression defining, for example, a measurable value, rate or origin> #2
    *    rate: <compose the rate of the specification> #3
    * }
    */
   _annotationInsideMdToObj(matchArray) {
      let inside = {
         complete: matchArray[0]
      };
      
      if (matchArray[1] != null)
         inside.expression = matchArray[1].trim(); 
      if (matchArray[2] != null)
         inside.specification = matchArray[2].trim(); 
      if (matchArray[3] != null)
         inside.rate = matchArray[3].trim(); 
      
      return inside;
   }

   /*
    * Annotation Obj to HTML
    * Output: [natural]
    */
   _annotationObjToHTML(obj) {
      return Translator.htmlTemplates.annotation.replace("[natural]", obj.natural.complete);
   }   
   
   /*
    * Text Obj to HTML
    * Output: [content]
    */
   _textObjToHTML(obj) {
      // return this._markdownTranslator.makeHtml(obj.content);
      return obj.content;
   }
   
   /*
    * Option Md to Obj
    * Input: + [label] ([rule]) -> [target] or * [label] ([rule]) -> [target]
    * Output:
    * {
    *    type: "option"
    *    subtype: "++" or "**" #1
    *    label: <label to be displayed -- if there is not an explicit divert, the label is the divert> #2
    *    rule:  <rule of the trigger -- determine its position in the knot> #3
    *    target: <target node to divert> #4
    * }
    */
   _optionMdToObj(matchArray) {
      let option = {
         type: "option",
         subtype: matchArray[1].trim()
      };
      
      if (matchArray[2] != null)
         option.label = matchArray[2].trim();
      else {
         option.label = matchArray[4].trim();
         const lastDot = option.label.lastIndexOf(".");
         if (lastDot > -1)
            option.label = option.label.substr(lastDot + 1);
      }
      if (matchArray[3] != null)
         option.rule = matchArray[3].trim();
      if (matchArray[4] != null)
         option.target = matchArray[4].trim();
      else
         option.target = matchArray[2].trim();
      
      return option;
   }
   
   /*
    * Option Obj to HTML
    * Output:
    *   <dcc-trigger id='dcc[seq]'  type='[subtype]' link='[link].html' label='[display]' [image] [location]></dcc-trigger>
    */
   _optionObjToHTML(obj) {
      // const display = (obj.label != null) ? obj.label : obj.target;
      const location = (obj.rule != null) ? " location='" + obj.rule + "'" : "";
      
      const optionalImage = "";
      // <TODO> Temporary
      /*
      const optionalImage = (obj.rule == null) ?
         " image='images/" + display.toLowerCase().replace(/ /igm, "-") + ".svg'" : 
         "";
      */
      
      return Translator.htmlTemplates.option.replace("[seq]", obj.seq)
                                            .replace("[subtype]", obj.subtype)
                                            .replace("[link]", obj.target)
                                            .replace("[display]", obj.label)
                                            .replace("[image]", optionalImage)
                                            .replace("[location]", location);
   }
   
   /*
    * Divert Md to Obj
    * Input: -> [target]
    * Output:
    * {
    *    type: "divert"
    *    target: <target node to divert> #1
    * }
    */
   _divertMdToObj(matchArray) {
      const target = matchArray[1].trim();
      let label = target;
      const lastDot = label.lastIndexOf(".");
      if (lastDot > -1)
         label = label.substr(lastDot + 1);
      
      return {
         type: "divert",
         label: label,
         target: target
      };
   }

   /*
    * Divert Obj to HTML
    * Output:
    *   <dcc-trigger id='dcc[seq]' link='[link].html' label='[display]'></dcc-trigger>
    */
   _divertObjToHTML(obj) {
      return Translator.htmlTemplates.divert.replace("[seq]", obj.seq)
                                            .replace("[link]", obj.target)
                                            .replace("[display]", obj.label);
   }

   /*
    * Talk Md to Obj
    * Input: :[character]: [talk]
    * Output:
    * {
    *    type: "talk"
    *    character: <identification of the character> #1
    *    speech: <character's speech> #2
     * }
    */
   _talkMdToObj(matchArray) {
      return {
         type: "talk",
         character: matchArray[1].trim(),
         speech: matchArray[2].trim()
      };
   }   

   /*
    * Talk Obj to HTML
    * Output:
    * <dcc-talk id='dcc[seq]' character='[character]' speech='[speech]'>
    * </dcc-talk>
    */
   _talkObjToHTML(obj) {
      // let charImg = "images/" + obj.character.toLowerCase()
      //                              .replace(/ /igm, "_") + "-icon.png";
      
      
      return Translator.htmlTemplates.talk.replace("[seq]", obj.seq)
                                          .replace("[character]", obj.character)
                                          .replace("[speech]", obj.speech);
   }   
   
   /*
    * Talk Open Md to Obj
    * Input: :[character]:
    * Output:
    * {
    *    type: "talk-open"
    *    character: <identification of the character> #1
     * }
    */
   _talkopenMdToObj(matchArray) {
      return {
         type: "talk-open",
         character: matchArray[1].trim()
      };
   }   

   /*
    * Talk Open Obj to HTML
    * Output:
    * <dcc-talk id='dcc[seq]' character='[character]'>
    */
   _talkopenObjToHTML(obj) {
      return Translator.htmlTemplates.talkopen.replace("[seq]", obj.seq)
                                              .replace("[character]", obj.character);
   }  
   
   /*
    * Talk Close Md to Obj
    * Input: ::
    * Output:
    * {
    *    type: "talk-close"
     * }
    */
   _talkcloseMdToObj(matchArray) {
      return {
         type: "talk-close"
      };
   }   

   /*
    * Talk Close Obj to HTML
    * Output:
    * </dcc-talk>
    */
   _talkcloseObjToHTML(obj) {
      return Translator.htmlTemplates.talkclose;
   }
   
   /*
    * Input Md to Obj
    * Input: {?[rows] [variable] : [vocabulary] # [write answer], ..., [write answer]; [wrong answer], ..., [wrong answer]}
    * Output:
    * {
    *    type: "input"
    *    variable: <variable that will receive the input> #2
    *    rows: <number of rows for the input> #1
    *    vocabulary: <the vocabulary to interpret the input> #3
    *    right: [<set of right answers>] #4
    *    wrong: [<set of wrong answers>] #5
    * }
    */
   _inputMdToObj(matchArray) {
      let input = {
             type: "input",
             variable: matchArray[2].trim().replace(/ /igm, "_")
      };
      
      if (matchArray[1] != null)
         input.rows = parseInt(matchArray[1]);
      
      if (matchArray[3] != null)
         input.vocabulary = matchArray[3].trim();
      
      if (matchArray[4] != null) {
         let right = matchArray[4].split(",");
         for (let r in right)
            right[r] = right[r].trim();
         input.right = right;
      }
      
      if (matchArray[5] != null) {
         let wrong = matchArray[5].split(",");
         for (let w in wrong)
            wrong[w] = wrong[w].trim();
         input.wrong = wrong;
      }
            
      return input;
   }
   
   /*
    * Input Obj to HTML
    * Output: <dcc-input id='dcc[seq]' variable='[variable]' rows='[rows]' [vocabulary]> 
    *         </dcc-input>
    */
   _inputObjToHTML(obj) {
      const rows = (obj.rows) ? " rows='" + obj.rows + "'" : "";
      const vocabulary = (obj.vocabulary) ? " vocabulary='" + obj.vocabulary + "'" : "";
      
      return Translator.htmlTemplates.input.replace("[seq]", obj.seq)
                                           .replace("[variable]", obj.variable)
                                           .replace("[rows]", rows)
                                           .replace("[vocabulary]", vocabulary);
   }

   /*
    * Selector Context Open Md to Obj
    * Input: {{ [context] #[evaluation]: [option-1], ..., [option-n]
    * Output:
    * {
    *    type: "context-open"
    *    context: <identification of the context> #1
    *    evaluation: <characteristic being evaluated in the context> #2
    *    options: <set of options> #3
    *    colors: <set of colors> #4
    * }
    */
   _selctxopenMdToObj(matchArray) {
      let context = {
         type: "context-open",
         context: matchArray[1].trim()
      };
      if (matchArray[2] != null)
         context.evaluation = matchArray[2].trim();
      if (matchArray[3] != null)
         context.options = matchArray[3];
      if (matchArray[4] != null)
         context.colors = matchArray[4].trim();
      
      // <TODO> weak strategy -- improve
      this._lastSelectorContext = context.context;
      this._lastSelectorEvaluation = context.evaluation;
      // console.log("1. last context: " + this._lastSelectorContext);

      return context;
   }
   
   /*
    * Selector Context Open Obj to HTML
    * Output: <dcc-group-selector id='dcc[seq]' context='[context]' evaluation='[evaluation]' states='[options]' colors='[colors]'>
    */
   _selctxopenObjToHTML(obj) {
      let evaluation = (obj.evaluation != null) ? " evaluation='" + obj.evaluation + "'" : "";
      let states = (obj.options != null) ? " states='" + obj.options + "'" : "";
      let colors = (obj.colors != null) ? " colors='" + obj.colors + "'" : "";
      
      return Translator.htmlTemplates.selctxopen.replace("[seq]", obj.seq)
                                                .replace("[context]", obj.context)
                                                .replace("[evaluation]", evaluation)
                                                .replace("[states]", states)
                                                .replace("[colors]", colors);
   }

   /*
    * Selector Context Close Md to Obj
    * Output:
    * {
    *    type: "context-close"
    * }
    */
   _selctxcloseMdToObj(matchArray) {
      return {
         type: "context-close"
      };
   }
   
   /*
    * Selector Context Close Obj to HTML
    * Output: </dcc-group-selector>
    */
   _selctxcloseObjToHTML(obj) {
      // console.log("3. last context: " + this._lastSelectorContext);
      // <TODO> weak strategy -- improve
      // delete this._lastSelectorContext;
      
      return Translator.htmlTemplates.selctxclose;
   }

   /*
    * Selector Md to Obj
    * Input: {[expression]}/[value]
    * Output:
    * {
    *    type: "selector"
    *    expression: <expression to be evaluated (natural)> #1
    *    value: <right value of the expression according to the evaluated context> #3
    * }
    */
   _selectorMdToObj(matchArray) {
      let selector = {
         type: "selector",
         expression: matchArray[1].trim()
      };
      if (matchArray[3] != null)
         selector.value = matchArray[3].trim();

      // <TODO> weak strategy -- improve
      if (this._lastSelectorContext) {
         if (this._lastSelectorContext == "answers")
            selector.present = "answer";
         else if (this._lastSelectorContext == "player")
            selector.present = this._lastSelectorEvaluation;
      }
      // console.log("2. last context: " + this._lastSelectorContext);
      return selector;
   }
   
   /*
    * Selector Obj to HTML
    * Output: <dcc-state-selector id='dcc[seq]'>[expression]</dcc-state-selector>
    */
   _selectorObjToHTML(obj) {
      let answer="";
      if (obj.present) {
         if (obj.present == "answer")
            answer = " answer='" + obj.value + "'";
         else
            answer = " player='" + obj.present + "'";
      } 
      
      return Translator.htmlTemplates.selector.replace("[seq]", obj.seq)
                                              .replace("[expression]", obj.expression)
                                              .replace("[answer]", answer);            
   }
}

(function() {
   Translator.marksKnotTitle = /((?:^[ \t]*(?:#+)[ \t]*(?:\w[\w \t]*)(?:\((?:\w[\w \t,]*)\))?[ \t]*#*[ \t]*$)|(?:^[ \t]*(?:\w[\w \t]*)(?:\((?:\w[\w \t,]*)\))?[ \t]*[\f\n\r](?:==+|--+)$))/igm;

   Translator.marksAnnotation = {
     // knot   : /^[ \t]*==*[ \t]*(\w[\w \t]*)(?:\(([\w \t]*)\))?[ \t]*=*[ \t]*[\f\n\r]/im,
     ctxopen : /\{\{([\w \t\+\-\*\."=\:%\/]+)(?:#([\w \t\+\-\*\."=\%\/]+):([\w \t\+\-\*"=\%\/,]+)(?:;([\w \t#,]+))?)?[\f\n\r]/im,
     ctxclose: /\}\}/im,
     annotation: /\{([\w \t\+\-\*"=\:%\/]+)(?:\(([\w \t\+\-\*"=\:%\/]+)\)[ \t]*)?(?:#([\w \t\+\-\*"=\:%\/]+))?\}/im
   };
   
   Translator.marksAnnotationInside = /([\w \t\+\-\*"]+)(?:[=\:]([\w \t%]*)(?:\/([\w \t%]*))?)?/im;

   Translator.marks = {
      knot   : /(?:^[ \t]*(#+)[ \t]*(\w[\w \t]*)(?:\((\w[\w \t,]*)\))?[ \t]*#*[ \t]*$)|(?:^[ \t]*(\w[\w \t]*)(?:\((\w[\w \t,]*)\))?[ \t]*[\f\n\r](==+|--+)$)/im,
      option : /^[ \t]*([\+\*])[ \t]*([^\(&> \t][^\(&>\n\r\f]*)?(?:\(([\w \t-]+)\)[ \t]*)?(?:-(?:(?:&gt;)|>)[ \t]*(\w[\w. \t]*))$/im,
      divert : /-(?:(?:&gt;)|>) *(\w[\w. ]*)/im,
      talk   : /^[ \t]*:[ \t]*(\w[\w \t]*):[ \t]*([^\n\r\f]+)$/im,
      talkopen: /^[ \t]*:[ \t]*(\w[\w \t]*):[ \t]*$/im,
      talkclose: /[ \t]*:[ \t]*:[ \t]*$/im,
      // image  : /<img src="([\w:.\/\?&#\-]+)" (?:alt="([\w ]+)")?>/im,
      input  : /\{[ \t]*\?(\d+)?([\w \t]*)(?:\:([\w \t]+))?(?:#([\w \t\+\-\*"=\%\/,]+)(?:;([\w \t\+\-\*"=\%\/,]+))?)?\}/im,
      selctxopen : Translator.marksAnnotation.ctxopen,
      selctxclose: Translator.marksAnnotation.ctxclose,
      selector   : Translator.marksAnnotation.annotation
      // annotation : 
      // score  : /^(?:<p>)?[ \t]*~[ \t]*([\+\-=\*\\%]?)[ \t]*(\w*)?[ \t]*(\w+)[ \t]*(?:<\/p>)?/im
   };
   
   Translator.specialCategories = ["start", "note"];
   
   Translator.contextHTML = {
      open:  /<p>(<dcc-group-selector(?:[\w \t\+\-\*"'=\%\/,]*)?>)<\/p>/igm,
      close: /<p>(<\/dcc-group-selector>)<\/p>/igm
   };
})();