/**
 * Translator of Case Notebooks
 * 
 * Translates case notebook narratives (extension of markdown) to object representations and further to HTML.
 */
class Translator {
   
   constructor() {
      this.authoringRender = false;

      this._markdownTranslator = new showdown.Converter();
   }

   /*
    * Properties
    */

   get authoringRender() {
      return this._authoringRender;
   }
   
   set authoringRender(newValue) {
      this._authoringRender = newValue;
   }

   get authorAttr() {
      return (this.authoringRender) ? " author" : "";
   }

   _authorAttrSub(superseq) {
      return (this.authoringRender && superseq == -1) ? " author" : "";
   }

   _subSeq(superseq, seq) {
      return (superseq == -1) ? seq : superseq * 1000 + seq;
   }

   /*
    * Proxy of Markdown functions
    */
   htmlToMarkdown(html) {
      return this._markdownTranslator.makeMarkdown(html);
   }

   /*
    * Compiles a markdown text to an object representation
    */
   async compileMarkdown(caseId, markdown) {
      let compiledCase = {
         id: caseId,
         knots: {},
         layers: {}
      }

      const layerBlocks = this._indexLayers(markdown, compiledCase);
      this._extractCaseMetadata(compiledCase);

      if (this._themeSettings)
         delete this._themeSettings;
      if (compiledCase.theme) {
         const themeSt = await MessageBus.int.request(
            "data/theme_family/" + compiledCase.theme + "/settings");
         if (themeSt != null)
            this._themeSettings = themeSt.message;
      }

      this._indexKnots(layerBlocks[0], compiledCase);
      
      for (let kn in compiledCase.knots) {
         this._extractKnotAnnotations(compiledCase.knots[kn]);
         this._compileKnotMarkdown(compiledCase.knots, kn);
      }

      // this._extractCaseMetadata(compiledCase);

      this._replicateImages(compiledCase);
      this._replicateInheritance(compiledCase);

      return compiledCase;
   }

   /*
    * Index all layers
    */
   _indexLayers(markdown, compiledCase) {
      let layerBlocks = markdown.split(Translator.marksLayerTitle);

      for (var lb = 1; lb < layerBlocks.length; lb += 2) {
         let layer = {
            _source: layerBlocks[lb + 1]
         };
         this._compileUnityMarkdown(layer);
         this._compileMerge(layer);
         compiledCase.layers[layerBlocks[lb].trim()] = layer;
      }

      return layerBlocks;
   }

   _extractCaseMetadata(compiledCase) {
      if (compiledCase.layers.Data) {
         const content = compiledCase.layers.Data.content;
         for (let c in content)
            if (content[c].type == "field") {
               if (content[c].field == "namespaces")
                  Context.instance.addNamespaceSet(content[c].value);
               else if (Translator.globalFields.includes(content[c].field))
                  compiledCase[content[c].field] = content[c].value;
            }
      }
   }

   /*
    * Index all knots to guide references
    */
   _indexKnots(markdown, compiledCase) {
      const size = markdown.length;
      const hasKnot =Translator.element.knot.mark.test(markdown);
      let mark = markdown;
      
      if (!hasKnot)
         mark = "# Initial Knot\n" + markdown;
      
      let knotCtx = [];
      let knotBlocks = mark.split(Translator.marksKnotTitle);
      for (var kb = 1; kb < knotBlocks.length; kb += 2) {
         let transObj =
            this._knotMdToObj(knotBlocks[kb].match(Translator.element.knot.mark));
         transObj.render = true;
         let label = transObj.title;
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
   }
   
   /*
    * Extract annotations of a single node
    */
   _extractKnotAnnotations(knot) {
      /*
      const mdAnnToObj = {
         "context-open" : this._contextOpenMdToObj,
         "context-close": this._contextCloseMdToObj,
         annotation: this._annotationMdToObj,
         select: this._selectMdToObj
      };
      */
      
      knot.annotations = [];
      let currentSet = knot.annotations;
      // let maintainContext = false;

      let mdfocus = knot._source;
      
      // let newSource = "";
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
            // translate the expression to an object
            let matchSize = mdfocus.match(Translator.marksAnnotation[selected])[0].length;
            let toTranslate = mdfocus.substr(matchStart, matchSize);
            const match = Translator.marksAnnotation[selected].exec(toTranslate);
            // let transObj = mdAnnToObj[selected]( );
            
            // hierarchical annotation building inside contexts
            switch (selected) {
               case "context-open":
                  let transObj = this._contextOpenMdToObj(match);
                  currentSet.push(transObj);
                  currentSet = [];
                  transObj.annotations = currentSet;
                  break;
               case "context-close":
                  currentSet = knot.annotations;
                  break;
               case "select":
                  currentSet.push(this._selectMdToObj(match));
                  break;
               case "annotation":
                  currentSet.push(this._annotationMdToObj(match));
                  break;
            }
            
            if (matchStart + matchSize >= mdfocus.length)
               matchStart = -1;
            else
               mdfocus = mdfocus.substring(matchStart + matchSize);
         }
      } while (matchStart > -1);
   }
   
   /*
    * Compiles a single knot to an object representation
    */
   _compileKnotMarkdown(knotSet, knotId) {
      let knot = knotSet[knotId];
      
      if (knot.categories)
         delete knot.categories;
      
      this._compileUnityMarkdown(knot);

      this._compileContext(knotSet, knotId);

      this._compileMerge(knot);

      // this._compileCompose(compiledKnot);
      
      // delete knot._preparedSource;
   }

   /*
    * Compiles a single unity (layer, knot or free) to an object representation
    *   - free compilation has test purposes in the Translator Playground
    */
   _compileUnityMarkdown(unity) {
      unity.content = [];
      let mdfocus = unity._source;
      
      this._objSequence = 0;

      let matchStart;
      do {
         // look for the next nearest expression match
         matchStart = -1;
         let selected = "";
         for (let mk in Translator.element) {
            // if (!((mk == "annotation" || mk == "select") &&
            //        this.authoringRender)) {
            let pos = mdfocus.search(Translator.element[mk].mark);
            if (pos > -1 && (matchStart == -1 || pos < matchStart)) {
               selected = mk;
               matchStart = pos;
            }
            // }
         }

         if (matchStart > -1) {
            // add a segment that does not match to any expression as type="text"
            if (matchStart > 0) {
               const submark = mdfocus.substring(0, matchStart);
               unity.content.push(this._initializeObject(
                  this._textMdToObj(submark, true), submark));
            }
            
            // translate the expression to an object
            let matchSize = mdfocus.match(Translator.element[selected].mark)[0].length;
            let toTranslate = mdfocus.substr(matchStart, matchSize);
            let transObj = this._initializeObject( 
               this._mdToObj(selected,
                  Translator.element[selected].mark.exec(toTranslate)), toTranslate);

            // attach to a knot array (if it is a knot) or an array inside a knot
            if (selected == "knot") {
               unity._sourceHead = toTranslate;
               if (transObj.categories)
                  unity.categories = transObj.categories;
               this._defineCategorySettings(
                  (transObj.categories) ? transObj.categories : null);
            } else
               unity.content.push(transObj);
            
            if (matchStart + matchSize >= mdfocus.length) {
               matchStart = -1;
               mdfocus = "";
            } else
               mdfocus = mdfocus.substring(matchStart + matchSize);
         }
      } while (matchStart > -1);
      if (mdfocus.length > 0)
         unity.content.push(
            this._initializeObject(this._textMdToObj(mdfocus), mdfocus));
   }

   _defineCategorySettings(categories) {
      let focusCategory = null;
      // when there is more than one category, priority in reverse order
      if (this._categorySettings)
         delete this._categorySettings;

      if (categories != null && this._themeSettings != null) {
         let cat = categories.length - 1;
         while (focusCategory == null && cat >= 0 &&
                !this._themeSettings[categories[cat]])
            cat--;
         if (cat >= 0)
            focusCategory = categories[cat];
         else
            focusCategory = "knot";
         if (this._themeSettings[focusCategory])
            this._categorySettings =
               this._themeSettings[focusCategory];
      }
   }

   /*
   _compileText(textMd, compiledKnot) {
      if (/^\t| [\t ]/.test(textMd)) {
         let textLines = textMd.split(/\f|\r?\n/);
         let subordinatedMd = textLines[0];
         let line = 1;
         for (; line < textLines.length &&
                /^\t| [\t ]/.test(textLines[line]); line++)
            subordinatedMd += "\n" + textLines[line];
         compiledKnot.push(this._initializeObject(
            this._textMdToObj(subordinatedMd, true), subordinatedMd));
         if (line < textLines.length) {
            console.log("inserindo linha");
            compiledKnot.push(this._initializeObject(
               this._linefeedMdToObj(["\n\n"]), "\n\n"));
            let freeMd = textLines[line];
            line++;
            for (; line < textLines.length; line++)
               freeMd += "\n" + textLines[line];
            compiledKnot.push(this._initializeObject(
               this._textMdToObj(freeMd, false), freeMd));
         }
      } else
         compiledKnot.push(this._initializeObject(
            this._textMdToObj(textMd, false), textMd));
   }
   */

   /*
    * Gives context to links and variables
    */ 
   _compileContext(knotSet, knotId) {
      let compiled = knotSet[knotId].content;
      for (let c in compiled) {
         if (compiled[c].type == "input" &&
             compiled[c].variable.indexOf(".") == -1)
            compiled[c].variable = knotId + "." + compiled[c].variable;
            // <TODO> can be interesting this link in the future
            // compiled[c].variable = this._findContext(knotSet, knotId, compiled[c].variable);
         else if (compiled[c].type == "context-open" &&
                  compiled[c].input.indexOf(".") == -1)
            compiled[c].input = knotId + "." + compiled[c].input;
             // <TODO> can be interesting this link in the future
            // compiled[c].input = this._findContext(knotSet, knotId, compiled[c].input);
         else if (compiled[c].type == "option" ||
                  compiled[c].type == "divert")
            compiled[c].contextTarget =
               this._findContext(knotSet, knotId, compiled[c].target);
         /*
         {
            let target = compiled[c].target.replace(/ /g, "_");
            let prefix = knotId;
            let lastDot = prefix.lastIndexOf(".");
            while (lastDot > -1) {
               prefix = prefix.substring(0, lastDot);
               if (knotSet[prefix + "." + target])
                  target = prefix + "." + target;
               lastDot = prefix.lastIndexOf(".");
            }
            compiled[c].contextTarget = target;
         }*/
      }
   }

   _findContext(knotSet, knotId, originalTarget) {
      let target = originalTarget.replace(/ /g, "_");
      if (!Translator.reservedNavigation.includes(target.toLowerCase())) {
         let prefix = knotId + ".";
         let lastDot = prefix.lastIndexOf(".");
         while (lastDot > -1) {
            prefix = prefix.substring(0, lastDot);
            if (knotSet[prefix + "." + target])
               target = prefix + "." + target;
            lastDot = prefix.lastIndexOf(".");
         }
      }
      return target;
   }

   /*
    * Merges text / subordinate fields and
    * adjusts the interpretation of line feeds
   */
   _compileMerge(unity) {
      let compiled = unity.content;

      // first cycle - transforms blockquote elements in attributes
      for (let c = 0; c < compiled.length; c++) {
         if (compiled[c].type == "blockquote") {
            if (c + 1 < compiled.length) {
               compiled[c+1].blockquote = true;
               compiled[c+1]._source = compiled[c]._source + compiled[c+1]._source;
               compiled.splice(c, 1);
               c--;
            }
         }
      }

      // second cycle - aggregates blockquoted linefeeds
      for (let c = 0; c < compiled.length-1; c++) {
         if (compiled[c+1].type == "linefeed" && compiled[c+1].blockquote &&
             compiled[c].type == "linefeed" &&
             (compiled[c].blockquote || compiled[c].content.length == 1)) {
            compiled[c].blockquote = true;
            compiled[c].content = compiled[c].content + compiled[c+1].content;
            compiled[c]._source = compiled[c]._source + compiled[c+1]._source;
            compiled.splice(c+1, 1);
            c--;
         }
      }

      // third cycle - define the identity of each item: field or list
      for (let c = 1; c < compiled.length; c++)
         if (compiled[c].type == "item") {
            let u = c-1;
            while (u >= 0 && compiled[u].type == "linefeed" ||
                   (!Translator.element[compiled[u].type].subfield &&
                    compiled[u].subordinate))
               u--;
            if (u >= 0 && Translator.element[compiled[u].type].subfield) {
               let field = {
                  type: "field",
                  presentation: compiled[c].presentation,
                  subordinate: compiled[c].subordinate,
                  field: compiled[c].label,
                  value: true,
                  _source: compiled[c]._source
               };
               if (compiled[c].level)
                  field.level = compiled[c].level;
               compiled[c] = field;
            } else {
               const markdown = {
                  type: "text",
                  subordinate: compiled[c].subordinate,
                  content: compiled[c].presentation,
                  _source: compiled[c]._source
               };
               compiled[c] = markdown;
            }
         }

      // fourth cycle - aggregates texts, mentions, annotations, selects, and images
      let tblock;
      let tblockSeq;
      for (let c = 0; c < compiled.length; c++) {
         if (Translator.textBlockCandidate.includes(compiled[c].type)) {
            const pr = (c > 1 && compiled[c-1].type == "linefeed") ? c-2 : c-1;
            const nx = (c+2 < compiled.length && compiled[c+1].type == "linefeed")
               ? c+2 : c+1;
            if (c == 0 || compiled[pr].type != "text-block") {
               // creates a new text-block
               if (nx < compiled.length &&
                   Translator.textBlockCandidate.includes(compiled[nx].type) &&
                   ((compiled[c].blockquote && compiled[nx].blockquote) ||
                    ((compiled[c].blockquote == null && compiled[nx].blockquote == null) &&
                     ((compiled[c].subordinate && compiled[nx].subordinate) ||
                      (!compiled[c].subordinate && !compiled[nx].subordinate))))) {
                  tblockSeq = 1;
                  compiled[c].seq = 1;
                  tblock = this._initializeObject(
                     { type: "text-block",
                       content: [compiled[c]],
                     }, compiled[c]._source);
                  if (compiled[c].subordinate)
                     tblock.subordinate = compiled[c].subordinate;
                  if (compiled[c].blockquote)
                     tblock.blockquote = compiled[c].blockquote;
                  compiled[c] = tblock;
               }
            } else if (c > 0 &&
                       ((compiled[c].blockquote && compiled[pr].blockquote) ||
                        ((compiled[c].blockquote == null && compiled[pr].blockquote == null) &&
                         ((compiled[c].subordinate && compiled[pr].subordinate) ||
                          (!compiled[c].subordinate && !compiled[pr].subordinate))))) {
               // adds element and previous linefeed (if exists)
               for (let e = pr+1; e <= c; e++) {
                  tblockSeq++;
                  compiled[e].seq = tblockSeq;
                  if (compiled[e].type == "linefeed")
                     compiled[e].render = true;
                  tblock.content.push(compiled[e]);
                  tblock._source += compiled[e]._source;
               }
               compiled.splice(pr+1, c-pr);
               c -= c-pr;
            }
         }
         if (c >= 0)
            compiled[c].seq = c + 1;
      }

      // fifith cycle - compute subordinated elements based on subordinators
      // <TODO> remove?
      for (let c = 1; c < compiled.length; c++) {
         const pr =
            (c > 1 && compiled[c-1].type == "linefeed") ? c-2 : c-1;
         if (Translator.subordinatorElement.includes(compiled[pr].type))
            compiled[c].subordinate = true;
      }

      // sixth cycle - computes field hierarchy
      let lastRoot = null;
      let lastField = null;
      let lastLevel = 0;
      let hierarchy = [];
      let levelHierarchy = [];
      for (let c = 0; c < compiled.length; c++) {
         if (compiled[c].type == "field") {
            if (lastRoot == null || !compiled[c].subordinate) {
               if (compiled[c].value == null)
                  compiled[c].value = {};
               lastRoot = compiled[c];
               lastField = compiled[c].value;
               lastLevel = compiled[c].level;
            } else {
               while (lastField != null &&
                      compiled[c].level <= lastLevel) {
                  lastField = hierarchy.pop();
                  lastLevel = levelHierarchy.pop();
               }
               if (lastField == null) {
                  if (compiled[c].value == null)
                     compiled[c].value = {};
                  lastRoot = compiled[c];
                  lastField = compiled[c].value;
                  lastLevel = compiled[c].level;
               } else {
                  if (typeof lastField !== "object")
                     lastField = {value: lastField};
                  lastField[compiled[c].field] =
                     (compiled[c].value == null) ? {} : compiled[c].value;
                  lastRoot._source += "\n" + compiled[c]._source;
                  hierarchy.push(lastField);
                  levelHierarchy.push(lastLevel);
                  lastField = lastField[compiled[c].field];
                  lastLevel = compiled[c].level;
                  compiled.splice(c, 1);
                  c--;
               }
            }
         } else {
            lastRoot = null;
            lastField = null;
            hierarchy = [];
         }
      }

      // seventh cycle - computes subordinate elements
      for (let c = 0; c < compiled.length; c++) {
         const pr = (c > 1 && compiled[c-1].type == "linefeed") ? c-2 : c-1;
         // later blockquotes and subordinates (excluding knot subordinates)
         if ((c > 0 && (c > 1 || compiled[c-1].type != "linefeed")) &&
             (compiled[c].subordinate || compiled[c].blockquote) &&
             Translator.element[compiled[pr].type]) {
            let merge = false;
            if (compiled[c].type == "field" &&
                Translator.element[compiled[pr].type].subfield !== undefined &&
                Translator.element[compiled[pr].type].subfield) {
               if (compiled[c].field.indexOf("answers") > -1) {
                  if (!compiled[pr].answers)
                     compiled[pr].answers = {};
                  let answerType = compiled[c].field.replace("answers", "").trim();
                  if (answerType.length == 0)
                     answerType = "untyped";
                  compiled[pr].answers[answerType] = {answers: compiled[c].value};
                  if (compiled[c].target)
                     compiled[pr].answers[answerType].target = compiled[c].target;
               } else {
                  let fieldName = compiled[c].field;
                  if (fieldName == "type")
                     fieldName = "subtype";
                  compiled[pr][fieldName] = compiled[c].value;
               }
               merge = true;
            } else if (compiled[c].type == "image" &&
                       Translator.element[compiled[pr].type].subimage !== undefined &&
                       Translator.element[compiled[pr].type].subimage) {
               compiled[pr].image = {
                  alternative: compiled[c].alternative,
                  path:  compiled[c].path };
               if (compiled[c].title)
                  compiled[pr].image.title = compiled[c].title;
               merge = true;
            } else if ((compiled[c].type == "text" ||
                        compiled[c].type == "text-block") &&
                       Translator.element[compiled[pr].type].subtext !== undefined &&
                       compiled[pr][Translator.element[compiled[pr].type].subtext] == null &&
                       (compiled[c].subordinate || compiled[c].blockquote)) {
               compiled[pr][Translator.element[compiled[pr].type].subtext] =
                     compiled[c].content;
               /*
               if (compiled[pr][Translator.element[compiled[pr].type].subtext] == null)
                  compiled[pr][Translator.element[compiled[pr].type].subtext] =
                     compiled[c].content;
               else
                  compiled[pr][Translator.element[compiled[pr].type].subtext] += "\n" +
                     compiled[c].content;
               */
               merge = true;
            }
            if (merge) {
               compiled[pr]._source += "\n" + compiled[c]._source;
               // transfers the linefeed of the last line of the block to the block
               compiled[pr].mergeLine =
                  Translator.element[compiled[c].type] &&
                  Translator.isLine.includes(compiled[c].type);
               /*
               compiled[pr].mergeLine =
                  (Translator.element[compiled[c].type] &&
                   Translator.element[compiled[c].type].line !== undefined)
                     ? Translator.element[compiled[c].type].line : false;
               */
               const shift = c - pr;
               compiled.splice(c - shift + 1, shift);
               c -= shift;
            }
         } 
         // previous blockquotes for inputs
         else if (compiled[c].type == "input" && compiled[pr].blockquote) {
            compiled[c][Translator.element[compiled[c].type].pretext] =
                  compiled[pr].content;
            compiled[c]._source = compiled[pr]._source + "\n" + compiled[c]._source;
            const shift = c - pr;
            compiled.splice(pr, shift);
            c -= shift;
         }
         // manages elements subordinated to the knot
         else if ((c == 0 || (c == 1 && compiled[c-1].type == "linefeed")) &&
                  compiled[c].subordinate && compiled[c].type == "image") {
            console.log("=== image back");
            unity.background = {
               alternative: compiled[c].alternative,
               path:  compiled[c].path };
            if (compiled[c].title)
               unity.background.title = compiled[c].title;
            compiled[c].render = false;
         }
         if (c >= 0)
            compiled[c].seq = c + 1;
      }

      // eighth cycle - joins script sentences
      // <TODO> quite similar to text-block (join?)
      let script;
      let scriptSeq;
      for (let c = 0; c < compiled.length; c++) {
         if (Translator.scriptable.includes(compiled[c].type)) {
            const line = (Translator.isLine.includes(compiled[c].type))
                         ? "\n" : "";
            /*
            const line = (Translator.element[compiled[c].type].line !== undefined &&
                          Translator.element[compiled[c].type].line)
                         ? "\n" : "";
            */
            if (c == 0 || compiled[c-1].type != "script") {
               if (c < compiled.length-1 &&
                   Translator.scriptable.includes(compiled[c+1].type)) {
                  scriptSeq = 1;
                  compiled[c].seq = 1;
                  script = this._initializeObject(
                     { type: "script",
                       content: [compiled[c]],
                     }, compiled[c]._source + line);
                  if (compiled[c].subordinate)
                     script.subordinate = compiled[c].subordinate;
                  compiled[c] = script;
               }
            } else {
               scriptSeq++;
               compiled[c].seq = scriptSeq;
               script.content.push(compiled[c]);
               script._source += compiled[c]._source + line;
               compiled.splice(c, 1);
               c--;
            }
         }
         if (c >= 0)
            compiled[c].seq = c + 1;
      }

      this._compileMergeLinefeeds(unity);
   }

   // merges texts separated by linefeeds and
   // removes extra linfefeeds when the element embeds it
   _compileMergeLinefeeds(unity) {
      let compiled = unity.content;
      for (let c = 0; c < compiled.length; c++) {
         // <TODO> remove?
         /*
         if (c > 0) {
            const pr =
               (c > 1 && compiled[c-1].type == "linefeed") ? c-2 : c-1;
            if (Translator.subordinatorElement.includes(compiled[pr].type))
               compiled[c].subordinate = true;
         }
         */

         /*
         if (compiled[c].type == "linefeed") {
            if (c > 0 && compiled[c-1].type == "text" &&
                c < compiled.length-1 && compiled[c+1].type == "text" &&
                compiled[c-1].subordinate == compiled[c+1].subordinate) {
               compiled[c-1].content += compiled[c].content +
                                            compiled[c+1].content;
               compiled[c-1]._source += compiled[c]._source +
                                            compiled[c+1]._source;
               compiled.splice(c, 2);
               c--; 
            } else if (c > 0 && compiled[c-1].type == "text-block" &&
                       c < compiled.length-1 &&
                       compiled[c+1].type == "text-block" &&
                       this._authoringRender) {
               compiled[c].render = true;
               compiled[c-1].content.push(compiled[c]);
               compiled[c-1].content = compiled[c-1].content
                                          .concat(compiled[c+1].content);
               for (let s in compiled[c-1].content)
                  compiled[c-1].content[s].seq = s;
               compiled[c-1]._source += compiled[c]._source +
                                            compiled[c+1]._source;
               compiled.splice(c, 2);
               c--;
            } 
              else */
         // removes extra linefeeds when the element embeds it
         if (compiled[c].type == "linefeed" &&
             (c == 0 ||
              // (compiled[c-1].type != "text" &&
              //compiled[c-1].type != "text-block" &&
              Translator.isLine.includes(compiled[c-1].type))) {
               if (compiled[c].content.length > 1) {
                  compiled[c].content = compiled[c].content.substring(1);
                  compiled[c]._source = compiled[c]._source.substring(1);
               } else {
                  compiled.splice(c, 1);
                  c--;
               }
         }
         if (c >= 0)
            compiled[c].seq = c + 1;
      }
      /*
      for (let c = 0; c < compiled.length; c++)
         if (compiled[c].type == "text-block")
            this._compileMergeLinefeeds(compiled[c]);
      */
   }

   /*
    * Joins inline elements in a composition
    */
   /*
   _compileCompose(compiledKnot) {

   }
   */

   /*
    * Replicates background and entity images
    */
   _replicateImages(compiledCase) {
      let lastBackground = null;
      let entityImage = {};
      let knots = compiledCase.knots;
      for (let k in knots) {
         if (knots[k].background)
            lastBackground = knots[k].background;
         else if (lastBackground != null)
            knots[k].background = lastBackground;
         for (let c in knots[k].content) {
            if (knots[k].content[c].type == "entity") {
               if (knots[k].content[c].image)
                  entityImage[knots[k].content[c].entity] =
                     knots[k].content[c].image;
               else if (entityImage[knots[k].content[c].entity])
                  knots[k].content[c].image =
                     entityImage[knots[k].content[c].entity];
            }
         }
      }
   }

   /*
    * Replicates inherited content
    */
   _replicateInheritance(compiledCase) {
      let knots = compiledCase.knots;
      for (let k in knots) {
         if (knots[k].inheritance) {
            const target = this._findContext(knots, k, knots[k].inheritance);
            if (knots[target]) {
               if (!knots[k].categories && knots[target].categories)
                  knots[k].categories = knots[target].categories;
               knots[k].content = JSON.parse(JSON.stringify(knots[target].content));
            }

            // adjusting the context
            // <TODO> this solution is provisory as I am removing the context to add again

            // removing context
            let compiled = knots[k].content;
            for (let c in compiled) {
               if (compiled[c].type == "input")
                  compiled[c].variable =
                     compiled[c].variable.substring(compiled[c].variable.lastIndexOf(".")+1);
               else if (compiled[c].type == "context-open")
                  compiled[c].input =
                     compiled[c].input.substring(compiled[c].input.lastIndexOf(".")+1);
            }
            // reinserting context
            this._compileContext(knots, k);
         }
      }
   }

   _mdToObj(mdType, match) {
      let obj;
      switch(mdType) {
         case "knot"   : obj = this._knotMdToObj(match); break;
         case "blockquote": obj = this._blockquoteMdToObj(match); break;
         case "image"  : obj = this._imageMdToObj(match); break;
         case "option" : obj = this._optionMdToObj(match); break;
         case "item"   : obj = this._itemMdToObj(match); break;
         case "field"  : obj = this._fieldMdToObj(match); break;
         case "divert-script" : obj = this._divertScriptMdToObj(match); break;
         case "divert" : obj = this._divertMdToObj(match); break;
         case "entity" : obj = this._entityMdToObj(match); break;
         case "mention": obj = this._mentionMdToObj(match); break;
         // case "talk-open" : obj = this._talkopenMdToObj(match); break;
         // case "talk-close": obj = this._talkcloseMdToObj(match); break;
         case "input"    : obj = this._inputMdToObj(match); break;
         case "output"   : obj = this._outputMdToObj(match); break;
         case "compute"  : obj = this._computeMdToObj(match); break;
         // <TODO> provisory: annotation recognition is duplicated to support code generation
         case "annotation"  : obj = this._annotationMdToObj(match); break;
         case "context-open"  : obj = this._selctxopenMdToObj(match); break;
         case "context-close" : obj = this._selctxcloseMdToObj(match); break;
         case "select"  : obj = this._selectMdToObj(match); break;
         case "linefeed": obj = this._linefeedMdToObj(match); break;
         // case "text": obj = this._textMdToObj(match); break;
      };
      return obj;
   }

   /*
    * Produce a sequential stamp to uniquely identify each recognized object
    */
   _initializeObject(obj, submark) {
      obj._source = submark;
      obj._modified = false;
      this._objSequence++;
      obj.seq = this._objSequence;
      return obj;
   }

   /*
    *
    */
   async generateHTML(knot) {
      this.newThemeSet();
      let finalHTML = await this.generateHTMLBuffer(knot);
      this.deleteThemeSet();
      return finalHTML;
   }

   newThemeSet() {
      this._themeSet = {};
   }

   deleteThemeSet() {
      // <TODO> there is some synchronization problem - it is deleting before finishing
      // delete this._themeSet;
   }
   
   async generateHTMLBuffer(knot) {
      this._defineCategorySettings(
         (knot.categories) ? knot.categories : null);
      let themes = (knot.categories)
                   ? knot.categories : ["knot"];
      for (let tp in themes)
         if (!this._themeSet[themes[tp]]) {
            const templ = await
                    this.loadTheme(themes[tp]);
            if (templ != "")
               this._themeSet[themes[tp]] = templ;
            else {
               if (!this._themeSet["knot"])
                  this._themeSet["knot"] = await
                     this._loadTheme("knot");
               this._themeSet[themes[tp]] = this._themeSet["knot"];
            }
         }
      let finalHTML = await this.generateKnotHTML(knot.content);
      const backPath = (knot.background !== undefined)
         ? Basic.service.imageResolver(knot.background.path) : "";
      const backAlt = (knot.background !== undefined) ? knot.background.alternative : "";
      console.log("=== before theme");
      console.log(finalHTML);
      for (let tp = themes.length-1; tp >= 0; tp--)
         finalHTML = this._themeSet[themes[tp]]
            .replace(/{knot}/igm, finalHTML)
            .replace(/{background-path}/igm, backPath)
            .replace(/{background-alternative}/igm, backAlt);
      return finalHTML;
   }

   async loadTheme(themeName) {
      const themeObj = await MessageBus.ext.request(
            "data/theme/" + Basic.service.currentThemeFamily +
            "." + themeName + "/get");
      return themeObj.message;
   }


   /*
    * Generate HTML in a single knot
    */
   generateKnotHTML(content, superseq) {
      let ss = (superseq) ? superseq : -1;
      let preDoc = "";
      let html = "";
      const preDocSet = ["text", "text-block", "script", "field",
                         "context-open", "context-close", "linefeed"];
      if (content != null) {
         // produces a pretext with object slots to process markdown
         for (let kc in content)
            preDoc += (preDocSet.includes(content[kc].type))
               ? this.objToHTML(content[kc], ss)
               : "@@" + content[kc].seq + "@@";

         html = this.markdownToHTML(preDoc);

         // replaces the marks
         let current = 0;
         let next = html.indexOf("@@");
         while (next != -1) {
            let end = html.indexOf("@@", next+1);
            let seq = parseInt(html.substring(next+2, end));
            while (current < content.length && content[current].seq < seq)
               current++;
            if (current >= content.length || content[current].seq != seq)
               console.log("Error in finding seq: " + seq);
            else
               html = html.substring(0, next) +
                      this.objToHTML(content[current], ss) +
                      html.substring(end+2);
            next = html.indexOf("@@");
         }
         
         html = html.replace(Translator.contextHTML.open,
                             this._contextSelectHTMLAdjust);
         html = html.replace(Translator.contextHTML.close,
                             this._contextSelectHTMLAdjust);
      }
      return html;
   }

   // converts markdown to HTML and adjusts a <dcc-markdown> wrong conversion
   markdownToHTML(markdown) {
      let html = this._markdownTranslator.makeHtml(markdown);

      html = html.replace(/<p><dcc-markdown id='dcc(\d+)'( author)?><\/p>/igm,
                          "<dcc-markdown id='dcc$1'$2>")
                 .replace(/<p><\/dcc-markdown><\/p>/igm, "</dcc-markdown>");
      return html;
   }

   objToHTML(obj, superseq) {
      let html;
      if (obj.render !== undefined && !obj.render)
         html = "";
      else
         switch(obj.type) {
            case "blockquote": html = this._blockquoteObjToHTML(obj); break;
            case "text"   : html = this._textObjToHTML(obj, superseq); break;
            case "text-block": html = this._textBlockObjToHTML(obj, superseq);
                               break;
            case "script": html = this._scriptObjToHTML(obj, superseq);
                           break;
            case "image"  : html = this._imageObjToHTML(obj); break;
            case "option" : html = this._optionObjToHTML(obj); break;
            case "field"  : html = this._fieldObjToHTML(obj); break;
            case "divert-script" :
               html = this._divertScriptObjToHTML(obj, superseq); break;
            case "divert" : html = this._divertObjToHTML(obj); break;
            case "entity" : html = this._entityObjToHTML(obj); break;
            case "mention": html = this._mentionObjToHTML(obj); break;
            // case "talk-open" : html = this._talkopenObjToHTML(obj); break;
            // case "talk-close": html = this._talkcloseObjToHTML(obj); break;
            case "input"   : html = this._inputObjToHTML(obj); break;
            case "output"  : html = this._outputObjToHTML(obj); break;
            case "compute" :
               html = this._computeObjToHTML(obj, superseq); break;
            case "context-open"  : // html = this._selctxopenObjToHTML(obj); break;
            case "context-close" : html = ""; break; // html = this._selctxcloseObjToHTML(obj); 
            case "select"     : html = this._selectObjToHTML(obj, superseq); break;
            case "annotation" : html = this._annotationObjToHTML(obj, superseq); break;
            case "linefeed"   : html = this._linefeedObjToHTML(obj); break;
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
      /*
      for (let kn in compiledCase.knots)
         md += compiledCase.knots[kn]._source;
      */
      for (let kn in compiledCase.knots) {
         // toCompile indicates a part generated only with markdown (by newKnot)
         // and cannot inversely generate markdown
         if (compiledCase.knots[kn].toCompile) {
            /*
            const lastType = Translator.element[compiledCase.knots[kn].content[
               compiledCase.knots[kn].content.length-1].type];
            md += compiledCase.knots[kn]._source +
                  ((lastType !== undefined &&
                    lastType.line !== undefined &&
                    lastType.line) ? "\n" : "");
            */
            md += compiledCase.knots[kn]._source;
         } else {
            md += compiledCase.knots[kn]._sourceHead + "\n";
            if (compiledCase.knots[kn].inheritance)
               md += "\n";
            else
               for (let ct in compiledCase.knots[kn].content) {
                  /*
                  let knotType =
                     Translator.element[compiledCase.knots[kn].content[ct].type];
                  */
                  const content = compiledCase.knots[kn].content[ct];
                  // const knotType = Translator.element[content.type];
                  /*
                  console.log("=== knot type");
                  console.log(compiledCase.knots[kn].content[ct].type);
                  console.log(knotType);
                  console.log(compiledCase.knots[kn].content[ct]._source +
                        ((knotType !== undefined &&
                          knotType.line !== undefined &&
                          knotType.line) ? "\n" : ""));
                  */

                  // linefeed of the merged block (if block), otherwise linefeed of the content
                  md += content._source +
                        (((content.mergeLine === undefined &&
                           Translator.isLine.includes(content.type)) ||
                          (content.mergeLine !== undefined &&
                           content.mergeLine))
                         ? "\n" : "");

                  /*
                  md += content._source +
                        (((knotType !== undefined &&
                           content.mergeLine === undefined &&
                           knotType.line !== undefined &&
                           knotType.line) ||
                          (content.mergeLine !== undefined &&
                           content.mergeLine))
                        ? "\n" : "");
                  */
                  /*
                  console.log((knotType !== undefined &&
                          knotType.line !== undefined &&
                          knotType.line));
                  */
               }
            }
      }
      
      for (let l in compiledCase.layers)
         md += Translator.markdownTemplates.layer.replace("[title]", l) +
               compiledCase.layers[l]._source;
      return md;
   }

   /*
    * Updates the markdown of an element according to its object representation
    */
   updateElementMarkdown(element) {
      // switch instead array to avoid binds
      switch (element.type) {
         case "knot": element._sourceHead = this._knotObjToMd(element);
                      // element._source = element._sourceHead;
                      break;
         case "text": element._source = this._textObjToMd(element);
                      break;
         case "image": element._source = this._imageObjToMd(element);
                       break;
         case "option": element._source = this._optionObjToMd(element);
                        break;
         case "entity": element._source = this._entityObjToMd(element);
                        break;
         case "input": element._source = this._inputObjToMd(element);
                        break;
      }

      // linefeed of the merged block (if block), otherwise linefeed of the content
      /*
      element._source += (((element.mergeLine === undefined &&
               Translator.isLine.includes(element.type)) ||
              (element.mergeLine !== undefined &&
               element.mergeLine))
             ? "\n" : "");
      console.log("=== element");
      console.log(element);
      */

      // element._source += "\n\n";
   }
   
   /*
    * Adjusts the HTML generated to avoid trapping the constext select tag in a paragraph
    */
   _contextSelectHTMLAdjust(matchStr, insideP) {
      return insideP;
   }
   
   /*
    * Knot Md to Obj
    */
   _knotMdToObj(matchArray) {
      let knot = {
         type: "knot"
      };
      
      if (matchArray[2] != null)
         knot.title = matchArray[2].trim();
      else
         knot.title = matchArray[5].trim();
      
      if (matchArray[3] != null)
         knot.categories = matchArray[3].split(",");
      else if (matchArray[6] != null)
         knot.categories = matchArray[6].split(",");
      if (knot.categories)
         for (let c in knot.categories)
            knot.categories[c] = knot.categories[c].trim();
      
      // moves special categories to the beggining of the list
      if (knot.categories != null) {
         for (let sc in Translator.specialCategories) {
            let cat = knot.categories.indexOf(Translator.specialCategories[sc]);
            if (cat >= 0) {
               let category = knot.categories[cat];
               knot.categories.splice(cat, 1);
               knot.categories.unshift(category);
            }
         }
      }
      
      if (matchArray[4] != null)
         knot.inheritance = matchArray[4].trim();
      else if (matchArray[7] != null)
         knot.inheritance = matchArray[7].trim();

      if (matchArray[1] != null)
         knot.level = matchArray[1].trim().length;
      else
         if (matchArray[8][0] == "=")
            knot.level = 1;
         else
            knot.level = 2;
         
      return knot;
   }
   
   /*
    * Knot Obj to Md
    */
   _knotObjToMd(obj) {
      return Translator.markdownTemplates.knot
                .replace("[level]", "#".repeat(obj.level))
                .replace("[title]", obj.title)
                .replace("[categories]",
                   (obj.categories)
                      ? " (" + obj.categories.join(",") + ")" : "")
                .replace("[inheritance]",
                   (obj.inheritance)
                      ? ": " + obj.inheritance : "");
   }
   
   /*
    * Blockquote Md to Obj
    */
   _blockquoteMdToObj(matchArray) {
      return {
         type: "blockquote",
         content: matchArray[0],
         blockquote: true
      };
   }

   /*
    * Blockquote Obj to HTML
    */
   _blockquoteObjToHTML(obj) {
      return obj.content;
   }

   /*
    * Text Raw to Obj
    */
   _textMdToObj(markdown) {
      return {
         type: "text",
         subordinate: /^\t| [\t ]/.test(markdown),
         content: markdown
      };
   }

   /*
    * Text Obj to HTML
    */
   _textObjToHTML(obj, superseq) {
      // return this._markdownTranslator.makeHtml(obj.content);
      let result = obj.content;
      if (this.authoringRender && superseq == -1)
         result = Translator.htmlTemplatesEditable.text
                    .replace("[seq]", this._subSeq(superseq, obj.seq))
                    .replace("[author]", this._authorAttrSub(superseq))
                    .replace("[content]", obj.content);
      return result;
      // return obj.content;
   }

   _textObjToMd(obj) {
      return ((obj.blockquote) ? "> " : "") + obj.content;
   }

   /*
    * Text Block Obj to HTML
    */
    _textBlockObjToHTML(obj, superseq) {
      let html = Translator.htmlTemplates.textBlock
                .replace("[seq]", this._subSeq(superseq, obj.seq))
                .replace("[author]", this._authorAttrSub(superseq))
                .replace("[content]", this.generateKnotHTML(obj.content,
                                         this._subSeq(superseq, obj.seq)));
      return html;
   }

   /*
    * Script Obj to HTML
    */
    _scriptObjToHTML(obj, superseq) {
      let html = Translator.htmlTemplates.script
                .replace("[seq]", this._subSeq(superseq, obj.seq))
                .replace("[author]", this._authorAttrSub(superseq))
                .replace("[content]", this.generateKnotHTML(obj.content,
                                      this._subSeq(superseq, obj.seq)));
      return html;
   }

   /*
    * Line feed Md to Obj
    */
   _linefeedMdToObj(matchArray) {
      return {
         type: "linefeed",
         content: matchArray[0],
         render: false
      };
   }

   /*
    * Line feed Obj to HTML
    */
   _linefeedObjToHTML(obj) {
      return (obj.render) ? obj.content.replace(/[\f\n\r][\f\n\r]/igm, "<br>") : "";
   }

   /*
    * Image Md to Obj
    */
   _imageMdToObj(matchArray) {
      let image = {
         type: "image",
         subordinate:
            (matchArray[1][0] === "\t" || matchArray[1].length > 1) ? true : false,
         alternative:  matchArray[2].trim(),
         path: matchArray[3].trim()
      };
      if (matchArray[4] != null)
         image.title = matchArray[3].trim();
      return image;
   }
   
   /*
    * Image Obj to HTML
    */
   _imageObjToHTML(obj, superseq) {
      /*
      const aRender = (authorRender)
         ? authorRender : this.authoringRender;
      */
      let result;
      if (this.authoringRender)
         result = Translator.htmlTemplatesEditable.image
            .replace("[seq]", obj.seq)
            .replace("[author]", this._authorAttrSub(superseq))
            .replace("[path]", obj.path)
            .replace("[alternative]", obj.alternative)
            .replace("[title]", (obj.title)
               ? " title='" + obj.title + "'" : "");
      else
         result = Translator.htmlTemplates.image
            .replace("[path]", Basic.service.imageResolver(obj.path))
            .replace("[alt]", (obj.title)
               ? " alt='" + obj.title + "'" : "");
      return result;
   }

   _imageObjToMd(obj) {
      return Translator.markdownTemplates.image
                .replace("{alternative}", obj.alternative)
                .replace("{path}", obj.path)
                .replace("{title}",
                   (obj.title) ? '"' + obj.title + '"' : "");
   }

   /*
    * Context Open Md to Obj
    */
   _contextOpenMdToObj(matchArray) {
      let context = {
         type: "context",
         context: matchArray[1].trim()
      };
      
      if (matchArray[2] != null) {
         context.evaluation = matchArray[2].trim();
         context.options = matchArray[3];
      }
     
      return context;
   }

   /*
    * Context Close Md to Obj
    */
   _contextCloseMdToObj(matchArray) {
   }   
   
   /*
    * Annotation Md to Obj
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
    */
   _annotationObjToHTML(obj, superseq) {
      return (this.authoringRender)
         ? Translator.htmlTemplates.annotation
                     .replace("[seq]", this._subSeq(superseq, obj.seq))
                     .replace("[author]", this._authorAttrSub(superseq))
                     .replace("[annotation]",
                         (obj.formal) ? " annotation='" + obj.formal.complete + "'" : "")
                     .replace("[content]", obj.natural.complete)
         : obj.natural.complete;
   }   
   
   /*
    * Option Md to Obj
    */
   _optionMdToObj(matchArray) {
      let option = {
         type: "option"
      };

      option.subtype = (matchArray[1] != null) ? matchArray[1].trim() : "_";
      
      if (matchArray[2] != null)
         option.label = matchArray[2].trim();
      /*
      if (matchArray[3] != null)
         option.rule = matchArray[3].trim();
      */
      if (matchArray[3] != null)
         option.target = matchArray[3].trim();
      if (matchArray[4] != null)
         option.value = matchArray[4].trim();
      
      return option;
   }

   /*
    * Option Obj to HTML
    */
   _optionObjToHTML(obj) {
      const optionalImage = "";
      // <TODO> Temporary
      /*
      const optionalImage = (obj.rule == null) ?
         " image='images/" + display.toLowerCase().replace(/ /igm, "-") + ".svg'" : 
         "";
      */

      let label;
      if (obj.label)
         label = obj.label;
      else {
         label = obj.target;
         const lastDot = label.lastIndexOf(".");
         if (lastDot > -1)
            label = label.substr(lastDot + 1);
      }
     
      return Translator.htmlTemplates.option
         .replace("[seq]", obj.seq)
         .replace("[author]", this.authorAttr)
         .replace("[subtype]", obj.subtype)
         .replace("[target]", this._transformNavigationMessage(obj.contextTarget))
         .replace("[display]", label)
         .replace("[value]",
            (obj.value == null) ? "" : " value='" + obj.value + "'")
         .replace("[image]", optionalImage);
   }
   
   _transformNavigationMessage(target) {
      let message;
      const lower = target.toLowerCase();
      if (Translator.reservedNavigation.includes(lower))
         message = Translator.navigationMap[lower];
      else
         message = "knot/" + target + "/navigate";
      return message;
   }

   _optionObjToMd(obj) {
      console.log("=== option markdown");
      console.log(obj);
      return Translator.markdownTemplates.option
                .replace("{subtype}", (obj.subtype == "_") ? "" : obj.subtype+" ")
                .replace("{label}", (obj.label) ? obj.label : "")
                .replace("{target}", obj.target);
   }
   
   /*
    * Field Md to Obj
    */
   _fieldMdToObj(matchArray) {
      let field = {
         type: "field",
         presentation: matchArray[0],
         subordinate:
            (matchArray[1][0] === "\t" || matchArray[1].length > 1) ? true : false,
         field: matchArray[2].trim()
      };
      if (matchArray[3] != null)
         field.value = matchArray[3].trim();
      if (Translator.fieldSet.includes(field.field) && field.value) {
         field.value = field.value.split(",");
         for (let fv in field.value)
            field.value[fv] = field.value[fv].trim();
      }
      if (matchArray[4] != null)
         field.target = matchArray[4].trim();
      if (field.subordinate)
         field.level = this._computeLevel(matchArray[1]);
      return field;
   }

   _computeLevel(indent) {
      let level = 0;
      let space = 0;
      for (let c in indent)
         if (indent[c] === "\t")
            level++;
         else {
            space++;
            if (space > 1) {
               level++;
               space = 0;
            }
         }
      return level;
   }

   /*
    * Field Obj to HTML
    */
   _fieldObjToHTML(obj) {
      return obj.presentation;
   }

   _itemMdToObj(matchArray) {
      let item = {
         type: "item",
         presentation: matchArray[0],
         subordinate:
            (matchArray[1][0] === "\t" || matchArray[1].length > 1) ? true : false,
         label: matchArray[2].trim()
      };
      if (item.subordinate)
         item.level = this._computeLevel(matchArray[1]);
      return item;
   }

   /*
    * Divert Script Md to Obj
    */
   _divertScriptMdToObj(matchArray) {
      let sentence = {
         type: "divert-script",
         target: matchArray[4].trim()
      };
      
      if (matchArray[1] != null)
         sentence.condition = {
            variable: matchArray[1].trim(),
            operator: matchArray[2].trim(),
            value: matchArray[3].trim()
         };

      if (matchArray[5] != null)
         sentence.parameter = {
            parameter: matchArray[5].trim() };
      
      return sentence;
   }
   
   /*
    * Divert Script Obj to HTML
    */
   _divertScriptObjToHTML(obj) {
      return Translator.htmlTemplates["divert-script"]
         .replace("[target]", obj.target)
         .replace("[parameter]", (obj.parameter)
            ? '"' + obj.parameter.parameter + '"' : "");
   }

   /*
    * Divert Md to Obj
    */
   _divertMdToObj(matchArray) {
      const label  = (matchArray[1]) ? matchArray[1].trim() : matchArray[2].trim();
      const target = (matchArray[3]) ? matchArray[3].trim() : matchArray[4].trim();
      return {
         type: "divert",
         label: label,
         target: target
      };
   }

   /*
    * Divert Obj to HTML
    */
   _divertObjToHTML(obj) {
      return Translator.htmlTemplates.divert
         .replace("[seq]", obj.seq)
         .replace("[author]", this.authorAttr)
         .replace("[target]",
            this._transformNavigationMessage(obj.contextTarget))
         .replace("[display]", obj.label);
   }

   /*
    * Entity Md to Obj
    */
   _entityMdToObj(matchArray) {
      let entity = {
         type: (this.authoringRender && this._categorySettings &&
                this._categorySettings.entity == "flat")
                  ? "mention" : "entity",
         entity: (matchArray[1] != null) ? matchArray[1].trim()
                                         : matchArray[2].trim()
      };
      /*
      if (matchArray[3] != null)
         entity.speech = matchArray[3].trim();
      */

      return entity;
   }

   _fieldCategorySetting(field) {
      let setting = "undefined";
      if (this._categorySettings) {
         if (this._categorySettings[field])
            setting = this._categorySettings[field];
         else if (this._categorySettings[Translator.genericFieldType])
            setting = this._categorySettings[Translator.genericFieldType];
      }
      return setting;
   }

   /*
    * Entity Obj to HTML
    */
   _entityObjToHTML(obj) {
      let path = "",
          alternative = "",
          title = "";
      if (obj.image) {
         path = " image='" + Basic.service.imageResolver(obj.image.path) + "'";
         alternative = " alternative='" + obj.image.alternative + "'";
         if (obj.image.title)
            title = " title='" + obj.image.title + "'";
      }
      const setting = this._fieldCategorySetting("entity");
      const template = (setting == "flat")
         ? Translator.htmlFlatTemplates : Translator.htmlTemplates;
      let text = (obj.text == null)
         ? "" : ((Array.isArray(obj.text))
            ? this.generateKnotHTML(obj.text) : obj.text);
      text = text.replace(/^<p>(.*)<\/p>$/im, "$1");
      return template.entity
                .replace("[seq]", obj.seq)
                .replace("[author]", this.authorAttr)
                .replace("[entity]", obj.entity)
                .replace("[text]", text)
                .replace("[image]", path)
                .replace("[alternative]", alternative)
                .replace("[title]", title);
   }

   _entityObjToMd(obj) {
      let entity = Translator.markdownTemplates.entity
                .replace("{entity}", obj.entity);
      if (obj.text)
         entity += "\n  " + obj.text;
      if (obj.image)
         entity += "\n  " + this._imageObjToMd(obj.image);

      return entity;
   }

   /*
    * Mention Md to Obj
    */
   _mentionMdToObj(matchArray) {
      return {
         type: "mention",
         entity: (matchArray[1] != null) ? matchArray[1].trim()
                                         : matchArray[2].trim()
      };
   }

   /*
    * Mention Obj to HTML
    */
   _mentionObjToHTML(obj) {
      return Translator.htmlTemplates.mention
         .replace("[seq]", obj.seq)
         .replace("[author]", this.authorAttr)
         .replace("[entity]", obj.entity);
   }

   /*
    * Talk Open Md to Obj
    */
   /*
   _talkopenMdToObj(matchArray) {
      let result = {
         type: "talk-open",
         character: matchArray[1].trim()
      };
      if (matchArray[2] != null) {
         result.image = {
            alternative:  matchArray[2].trim(),
            path: matchArray[3].trim()
         };
         if (matchArray[4] != null)
            result.image.title = matchArray[4].trim();
      }
      return result;
   }
   */   

   /*
    * Talk Open Obj to HTML
    */
   /*
   _talkopenObjToHTML(obj) {
      return Translator.htmlTemplates["talk-open"]
         .replace("[seq]", obj.seq)
         .replace("[author]", this.authorAttr)
         .replace("[character]", obj.character)
         .replace("[image]",
            (obj.image) ? " image='" + obj.image.path + "' alt='" : "")
         .replace("[alt]",
            (obj.image && obj.image.title)
               ? " alt='" + obj.title + "'" : "");
   }
   */  
   
   /*
    * Talk Close Md to Obj
    */
   /*
   _talkcloseMdToObj(matchArray) {
      return {
         type: "talk-close"
      };
   }
   */   

   /*
    * Talk Close Obj to HTML
    */
   /*
   _talkcloseObjToHTML(obj) {
      return Translator.htmlTemplates["talk-close"];
   }
   */
   
   /*
    * Input Md to Obj
    */
   _inputMdToObj(matchArray) {
      return {
         type: "input",
         variable: matchArray[1].trim().replace(/ /igm, "_")
      };
   }
   
   /*
    * Input Obj to HTML
    */
   _inputObjToHTML(obj) {
      // core attributes are not straight mapped
      const coreAttributes = ["seq", "author", "type", "subtype", "text",
                              "show", "_source", "_modified", "mergeLine"];
      const subtypeMap = {
         short: "input-typed",
         text: "input-typed",
         "group select": "group-select",
         slider: "slider",
         table: "input-table"
      };
      const subtype = (obj.subtype)
         ? subtypeMap[obj.subtype] : subtypeMap.short;

      const statement = (obj.text) ? obj.text : "";

      // <TODO> provisory - weak strategy (only one per case)
      let answer="";
      if (this._playerInputShow || this.authoringRender) {
         if (this._playerInputShow == "#answer" || this.authoringRender)
            answer = " answer='" + obj.value + "'";
         else
            answer = " player='" + this._playerInputShow + "'";
      }

      let extraAttr = "";
      for (let atr in obj)
         if (!coreAttributes.includes(atr) && obj[atr] != "false")
            extraAttr += " " + atr +
                         ((obj[atr] == "true") ? "" : "='" + obj[atr] + "'");

      let input = Translator.htmlTemplates.input
                     .replace(/\[dcc\]/igm, subtype)
                     .replace("[seq]", obj.seq)
                     .replace("[author]", this.authorAttr)
                     .replace("[variable]", obj.variable)
                     .replace("[statement]", statement)
                     .replace("[extra]", extraAttr);

      if (obj.subtype == "group select") {
         // <TODO> weak strategy -- improve
         // indicates how related selects will behave
         this._playerInputShow = null;
         if (obj.show)
            if (obj.show == "answer")
               this._playerInputShow = "#answer";
            else
               this._playerInputShow = obj.variable;
      }

      return input;
   }

  /*
    * Input Obj to Md
    */
   _inputObjToMd(obj) {
      // core attributes are not straight mapped
      const coreAttributes = ["seq", "author", "variable", "type", "subtype", "text",
                              "_source", "_modified", "mergeLine"];
      let extraAttr = "";
      for (let atr in obj)
         if (!coreAttributes.includes(atr))
            extraAttr += this._mdSubField(atr, obj[atr]);

      return Translator.markdownTemplates.input
                          .replace("{statement}", (obj.text) ? "> " + obj.text + "\n" : "")
                          .replace("{variable}", obj.variable)
                          .replace("{subtype}",
                             (obj.subtype) ? this._mdSubField("type", obj.subtype) : "")
                          .replace("{extra}", extraAttr);
   }

   _mdSubField(label, value) {
      return (value == null || value.length == 0) ? "" :
         "\n  * " + label + ": " + value;
   }

   /*
    * Output Md to Obj
    */
   _outputMdToObj(matchArray) {
      let output = {
         type: "output",
         variable: matchArray[1].trim().replace(/ /igm, "_")
      };
      if (matchArray[2] != null)
         output.index = parseInt(matchArray[2].trim());
      if (matchArray[3] != null)
         output.variant = matchArray[3].trim();
      return output;
   }

   /*
    * Output Obj to HTML
    */
   _outputObjToHTML(obj) {
      return Translator.htmlTemplates.output
                .replace("[seq]", obj.seq)
                .replace("[author]", this.authorAttr)
                .replace("[variable]", obj.variable)
                .replace("[index]", (obj.index != null) ? "[" + obj.index + "]" : "")
                .replace("[variant]", (obj.variant != null) ? " " + obj.variant : "");
   }

   /*
    * Compute Md to Obj
    */
   _computeMdToObj(matchArray) {
      let sentence = {
         type: "compute",
         operator: matchArray[2],
         value: matchArray[3].trim()
      };
      
      if (matchArray[1] != null)
         sentence.variable = matchArray[1].trim();
      
      return sentence;
   }
   
   /*
    * Compute Obj to HTML
    */
   _computeObjToHTML(obj) {
      const variable = (obj.variable != null)
               ? obj.variable : Translator.defaultVariable;

      const instruction = variable + obj.operator + obj.value;

      return Translator.htmlTemplates.compute
                .replace("[instruction]", instruction);
   }

   /*
    * Select Context Open Md to Obj
    */
   _selctxopenMdToObj(matchArray) {
      let context = {
         type: "context-open"
      };

      if (matchArray[1] != null)
         context.context = matchArray[1].trim();
      if (matchArray[2] != null)
         context.input = matchArray[2].trim().replace(/ /igm, "_");
      
      // <TODO> weak strategy -- improve
      // this._currentInputContext = context.context;

      return context;
   }
   
   /*
    * Select Context Open Obj to HTML
    */
   _selctxopenObjToHTML(obj) {
      let input = (obj.input != null) ? " input='" + obj.input + "'" : "";
      // let states = (obj.options != null) ? " states='" + obj.options + "'" : "";
      // let colors = (obj.colors != null) ? " colors='" + obj.colors + "'" : "";

      return Translator.htmlTemplates.selctxopen.replace("[seq]", obj.seq)
                                                .replace("[author]", this.authorAttr)
                                                .replace("[context]", obj.context)
                                                .replace("[input]", input);
                                                /*
                                                .replace("[states]", states)
                                                .replace("[colors]", colors);
                                                */
   }

   /*
    * Select Context Close Md to Obj
    */
   _selctxcloseMdToObj(matchArray) {
      return {
         type: "context-close"
      };
   }
   
   /*
    * Select Context Close Obj to HTML
    */
   _selctxcloseObjToHTML(obj) {
      return Translator.htmlTemplates.selctxclose;
   }

   /*
    * Select Md to Obj
    */
   _selectMdToObj(matchArray) {
      let select = {
         type: "select",
         expression: matchArray[1].trim()
      };
      if (matchArray[3] != null)
         select.value = matchArray[3].trim();

      // <TODO> weak strategy -- improve
      /*
      if (this._currentInputContext) {
         if (this._lastSelectContext == "answer")
            select.present = "answer";
         else if (this._lastSelectContext == "player")
            select.present = this._lastSelectEvaluation;
      }
      */
      return select;
   }
   
   /*
    * Select Obj to HTML
    */
   _selectObjToHTML(obj, superseq) {
      /*
      const aRender = (authorRender)
         ? authorRender : this.authoringRender;
      */
      let answer="";
      if (this._playerInputShow || this.authoringRender) {
         if (this._playerInputShow == "#answer" || this.authoringRender)
            answer = " answer='" + obj.value + "'";
         else
            answer = " player='" + this._playerInputShow + "'";
      }

      // let result = obj.expression;
      // if (!this.authoringRender)
      // let result = Translator.htmlTemplates.select
      return Translator.htmlTemplates.select
                       .replace("[seq]", this._subSeq(superseq, obj.seq))
                       .replace("[author]", this._authorAttrSub(superseq))
                       .replace("[expression]", obj.expression)
                       .replace("[answer]", answer);

      // return result;
   }

}

(function() {
   Translator.marksLayerTitle = /^[ \t]*\_{2,}((?:.(?!\_{2,}))*.)(?:\_{2,})?[ \t]*$/igm;
   Translator.marksKnotTitle = /((?:^[ \t]*(?:#+)[ \t]*(?:[^\( \t\n\r\f][^\(\n\r\f]*)(?:\((?:\w[\w \t,]*)\))?(?:\:[ \t]*[^\(\n\r\f][^\(\n\r\f\t]*)?[ \t]*#*[ \t]*$)|(?:^[ \t]*(?:[^\( \t\n\r\f][^\(\n\r\f]*)(?:\((?:\w[\w \t,]*)\))?(?:\:[ \t]*[^\(\n\r\f][^\(\n\r\f\t]*)?[ \t]*[\f\n\r][\n\r]?(?:==+|--+)$))/igm;

   Translator.element = {
      knot: {
         mark: /(?:^[ \t]*(#+)[ \t]*([^\( \t\n\r\f\:][^\(\n\r\f\:]*)(?:\((\w[\w \t,]*)\))?[ \t]*(?:\:[ \t]*([^\(\n\r\f][^\(\n\r\f\t]*))?[ \t]*#*[ \t]*$)|(?:^[ \t]*([^\( \t\n\r\f\:][^\(\n\r\f\:]*)(?:\((\w[\w \t,]*)\))?[ \t]*(?:\:[ \t]*([^\(\n\r\f][^\(\n\r\f\t]*))?[ \t]*[\f\n\r][\n\r]?(==+|--+)$)/im,
         subfield: true,
         subimage: true },
      blockquote: {
         mark: /^[ \t]*>[ \t]*/im,
      },
      image: {
         mark: /([ \t]*)!\[([\w \t]*)\]\(([\w:.\/\?&#\-~]+)[ \t]*(?:"([\w ]*)")?\)/im,
         inline: true },
      field: {
         mark: /^([ \t]*)(?:[\+\*])[ \t]+([\w.\/\?&#\-][\w.\/\?&#\- \t]*):[ \t]*([^&>\n\r\f]+)?(?:-(?:(?:&gt;)|>)[ \t]*([^\(\n\r\f]+))?$/im,
         subfield: true,
         subimage: true,
         subtext:  "value" },
      item: {
         mark: /^(  |\t[ \t]*)(?:[\+\*])[ \t]+([\w.\/\?&#\-][\w.\/\?&#\- \t]*)$/im,
         subtext: "value" },
      option: {
         mark: /^[ \t]*([\+\*])[ \t]+([^\(&> \t\n\r\f][^\(&>\n\r\f]*)?-(?:(?:&gt;)|>)[ \t]*([^"\n\r\f]+)(?:"([^"\n\r\f]+)")?[ \t]*$/im
         },
      "divert-script": {
         mark: /^[ \t]*(?:\(([\w\.]+)[ \t]*(==|>|<|>=|<=|&gt;|&lt;|&gt;=|&lt;=)[ \t]*((?:"[^"\n\r\f]+")|(?:\-?\d+(?:\.\d+)?)|(?:[\w\.]+))\)[ \t]*)?-(?:(?:&gt;)|>)[ \t]*([^"\n\r\f]+)(?:"([^"\n\r\f]+)")?[ \t]*$/im,
         },
      divert: {
         mark: /(?:(\w+)|"([^"]+)")(?:[ \t])*-(?:(?:&gt;)|>)[ \t]*(?:(\w[\w.]*)|"([^"]*)")/im,
         inline: true },
      entity: {
         mark: /@(?:(\w[\w \t]*)|"([\w \t]*)")(?::[ \t]*)?$/im,
         subfield: true,
         subimage: true,
         subtext:  "text" },
      mention: {
         mark: /@(?:(\w+)|"([\w \t]*)")/im,
         inline: true },
      input: {
         mark: /^\?[ \t]+([^\t\n\r\f]+)$/im,
         subfield: true,
         subimage: true,
         pretext: "text" },
      "output": {
         mark: /\^([\w \t\.]+)(?:\[([\w \t]+)\])?(?:\(([\w \t]+)\))?\^/im,
         inline: true },
      compute: {
         mark: /~[ \t]*(\w+)?[ \t]*([+\-*/=])[ \t]*(\d+(?:\.\d+)?)$/im,
         },
      "context-open": {
         mark: /\{\{([\w \t\+\-\*\."=\:%]+)?(?:\/([\w \t\.\:]+)\/)?$/im },
      "context-close": {
         mark: /\}\}/im },
      select: {
         mark: /\{([^\}\n\r\f]+)\}(?:\(([^\)\n\r\f]+)\))?(?:\/([^\/\n\r\f]+)\/)/im,
         inline: true },
      annotation: {
         mark: /\{([^\}\n\r\f]+)\}(?:\(([^\)\n\r\f]+)\))?/im,
         inline: true },
      linefeed: {
         mark: /[\f\n\r]+/im,
         inline: true }
      /*
      text: {
         mark: /([ \t]*)([^\f\n\r]+)$/im,
         line: true }
      */
   };

   Translator.marksAnnotation = {
     "context-open" : Translator.element["context-open"].mark,
     "context-close": Translator.element["context-close"].mark,
     select: Translator.element.select.mark,
     annotation: Translator.element.annotation.mark
   };
   
   Translator.marksAnnotationInside = /([^=\:\n\r\f]+)(?:[=\:]([\w \t%]*)(?:\/([\w \t%]*))?)?/im;

   // <TODO> this is a different approach indicating characteristic by type
   // (homogenize?)
   Translator.subordinatorElement = ["entity"];
   Translator.isLine = ["knot", "field", "item", "option", "divert-script", "entity", "input",
                        "compute", "context-open"];
   Translator.textBlockCandidate = ["select", "annotation", "text", "mention", "image"];
   Translator.scriptable = ["compute", "divert-script"];

   Translator.fieldSet = ["vocabularies", "answers", "states", "labels"];

   Translator.inputSubtype = ["short", "text", "group select", "table"];

   Translator.globalFields = ["theme", "title", "role", "templates"];

   Translator.reservedNavigation = ["case.next", "knot.previous", "knot.next",
                                    "flow.next", "session.close"];
   Translator.navigationMap = {
      "case.next":     "case/>/navigate",
      "knot.start":    "knot/<</navigate",
      "knot.previous": "knot/</navigate",
      "knot.next":     "knot/>/navigate",
      "flow.next":     "flow/>/navigate",
      "session.close": "session/close"
   };
   
   // Translator.specialCategories = ["start", "note"];
   
   Translator.contextHTML = {
      open:  /<p>(<dcc-group-select(?:[^>]*)?>)<\/p>/igm,
      close: /<p>(<\/dcc-group-select>)<\/p>/igm
   };

   Translator.defaultVariable = "points";

   Translator.genericFieldType = "generic";

   Translator.instance = new Translator();
})();