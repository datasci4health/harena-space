(function () {
  Translator.htmlTemplates = {
    annotation:
'<dcc-annotation id=\'dcc[seq]\'[annotation][author]>[content]</dcc-annotation>',
    textBlock:
`


<dcc-markdown id='dcc[seq]'[author]>

[content]

</dcc-markdown>


`,
    script:
`


<dcc-markdown id='dcc[seq]'[author]>

[content]

</dcc-markdown>


`,
    image:
'<figure class="image[imgresized]"[resize]><img src="[path]"[alt]>[caption]</figure>',
    option:
'<dcc-button id=\'dcc[seq]\'[author] topic=\'[target]\' label=\'[display]\'[divert][message][image][connect]></dcc-button>[compute]',
    divert:
'<dcc-button id=\'dcc[seq]\'[author] topic=\'[target]\' label=\'[display]\' divert=\'[divert]\' location=\'#in\' inline></dcc-button>',
    'divert-script':
'-&gt; [target][parameter]<br>',
    entity:
'<dcc-entity id=\'dcc[seq]\'[author] entity=\'[entity]\'[image][alternative][title]>[text]</dcc-entity>',
    mention:
'<b>[entity]: </b>',
    input:
'<dcc-[dcc] id=\'dcc[seq]\'[author][extra]>[statement]</dcc-[dcc]>',
    choice:
'<dcc-input-option [target]value="[value]"[compute]>[option]</dcc-input-option><br>',
    output:
'<dcc-expression id=\'dcc[seq]\'[author] expression=\'[variable][index]\'[variant] active></dcc-expression>',
    compute:
'<dcc-compute expression=\'[instruction]\' onload></dcc-compute>',
    domain:
'[natural]',
    select:
'<dcc-state-select id=\'dcc[seq]\'[author][answer]>[expression]</dcc-state-select>'
  }

  Translator.htmlSubTemplates = {
    compute: {
      connect: ' connect="dcc[seq]-compute:compute/update:click"',
      component: '<dcc-compute id="dcc[seq]-compute" expression="[expression]"></dcc-compute>'
    }
  }

  Translator.htmlFlatTemplates = {
    entity:
'<p><b>[entity]: </b>[text]</p>'
  }

  Translator.htmlTemplatesEditable = {
    text:
`


<dcc-markdown id='dcc[seq]'[author]>

[content]

</dcc-markdown>


`,
    image:
'<dcc-image id=\'dcc[seq]\'[author] image=\'[path]\' alternative=\'[alternative]\'[title]></dcc-image>'
  }

  Translator.markdownTemplates = {
    layer:
'___ [title] ___',
    knot:
'[level] [title][categories][inheritance]',
    image:
'![{alternative}]({path}{resize}{title})',
    option:
'{subtype}{label} {divert} {target}{message}{state}',
    entity:
'@{entity}',
    input:
'{statement}? {variable}{subtype}{extra}',
    choice:
'+ {label} <-> {target}{message}{state}'
  }

  Translator.objTemplates = {
    text: {
      type: 'text',
      content: 'Type your text here'
    },
    image: {
      type: 'image',
      alternative: 'Image',
      path: '../templates/basic/images/landscape.svg',
      title: 'Image'
    },
    option: {
      type: 'option',
      subtype: '*',
      label: 'Button',
      target: 'Target'
    }
  }
})()
