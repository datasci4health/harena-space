(function() {
Translator.htmlTemplates = {
option:
`<dcc-trigger id='dcc[seq]' type='[subtype]' link='[link]' label='[display]' [image][location]></dcc-trigger>`,
divert:
`<dcc-trigger id='dcc[seq]' type='+' link='[link]' label='[display]'></dcc-trigger>`,
talk:
`<dcc-talk id='dcc[seq]' character='[character]' speech='[speech]'>
</dcc-talk>`,
talkopen:
`

<dcc-talk id='dcc[seq]' character='[character]'>

`,
talkclose:
`

</dcc-talk>

`,
input:
`<dcc-input id='dcc[seq]' variable='[variable]'[rows][vocabulary]> 
</dcc-input>`,
domain:
`[natural]`,
selctxopen:
`

<dcc-group-selector id='dcc[seq]' context='[context]' [evaluation][states][colors]>

`,
selctxclose:
`

</dcc-group-selector>

`,
selector:
`<dcc-state-selector id='dcc[seq]'[answer]>[expression]</dcc-state-selector>`
};
})();