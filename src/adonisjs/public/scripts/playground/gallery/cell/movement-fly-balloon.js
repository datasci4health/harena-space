(function () {
  AuthorCellManager.instance.insertSource(
    'Balões Voadores',
    [['empty', '_', { src: 'images/cell/cell-blue.svg', width: 25, height: 25, alt: 'vazio' }],
      ['balloon', 'b', { src: 'images/cell/balloon01.svg', width: 25, height: 25, alt: 'balão' }],
      ['tree', 't', { src: 'images/cell/tree01.svg', width: 25, height: 25, alt: 'árvore' }]],
`<block type="neighbor"></block>
<block type="action"></block>`,
`<dcc-space-cellular-editor id="cellular-space" cell-width="50" cell-height="50" background-color="#d6f0ffff" grid>
______
______
______
______
______
___b__
_____t
</dcc-space-cellular-editor>

<dcc-cell-image type="b" label="balloon" image="images/cell/balloon01.svg">
</dcc-cell-image>
<dcc-cell-image type="t" label="tree" image="images/cell/tree01.svg"></dcc-cell-image>

<dcc-timer cycles="100000" interval="1000" publish="state/next">
   <subscribe-dcc topic="timer/start" map="start"></subscribe-dcc>
   <subscribe-dcc topic="timer/stop" map="stop"></subscribe-dcc>
</dcc-timer>

<subscribe-dcc target="cellular-space" topic="type/#"></subscribe-dcc>
<subscribe-dcc target="cellular-space" topic="state/next" map="next"></subscribe-dcc>
<subscribe-dcc target="cellular-space" topic="state/save" map="save"></subscribe-dcc>
<subscribe-dcc target="cellular-space" topic="state/reset" map="reset"></subscribe-dcc>`,
`Selecione um dos ícones abaixo para editar o ambiente:
<div style="flex:48px; max-height:48px; display:flex; flex-direction:row; border:2px">
   <div style="flex:10%; max-width:48px; max-height:48px; margin-right:10px">
      <dcc-button label="Árvore" topic="type/tree"
                   image="images/cell/tree01.svg">
      </dcc-button>
   </div>
   <div style="flex:10%; max-width:48px; max-height:48px; margin-right:10px">
      <dcc-button label="Balão" topic="type/balloon"
                   image="images/cell/balloon01.svg">
      </dcc-button>
   </div>
   <div style="flex:10%; max-width:48px; max-height:48px; margin-right:10px">
      <dcc-button label="Nada" topic="type/empty"
                   image="images/cell/cell-blue.svg">
      </dcc-button>
   </div>
</div>`
  )
})()
