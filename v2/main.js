let viewer;
let tree;
let label;

window.addEventListener("DOMContentLoaded", function() {

    viewer = new Viewer('c');

    //label = viewer.createLabel();
    //label.setText("Hello, world!");
    viewer.runRenderLoop();

    let scene = viewer.scene;
    
    // let axes = createAxes(scene);

    
    fetch('data/data.json')
        .then(response => response.json())
        .then(data => {
            // console.log(data);

            const mb = new TreeModelBuilder();
            tree = mb.build(data, viewer.scene);    
        
            

        });

    
    scene.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case BABYLON.KeyboardEventTypes.KEYDOWN:
                /*
                if(kbInfo.event.key == "ArrowUp") hTranslate(2,-0.1);
                else if(kbInfo.event.key == "ArrowDown") hTranslate(2,0.1);
                else if(kbInfo.event.key == "ArrowLeft") rotate(-0.1);
                else if(kbInfo.event.key == "ArrowRight") rotate(0.1);
                else if(kbInfo.event.key == "w") hTranslate(1,-0.1);
                else if(kbInfo.event.key == "z") hTranslate(1,0.1);
                else if(kbInfo.event.key == "a") hTranslate(0,0.1);
                else if(kbInfo.event.key == "s") hTranslate(0, -0.1);
                else console.log(kbInfo.event.key);
                */
                break;
            case BABYLON.KeyboardEventTypes.KEYUP:
                break;
        }
    });

    scene.onPointerDown = function(evt, pickInfo) {
        if(pickInfo.hit && pickInfo.pickedMesh) {
            let mesh = pickInfo.pickedMesh;
            if(mesh.node)  {
                tree.moveNodeToCenter(mesh)
            }
            // console.log(mesh.nodeIndex);
            // tree.selectNode(mesh.nodeIndex);
        }
    }
   /*

    let arr = tree.nodes.map((nd,i) => ({nd, i, dist: nd.ball.position.length()}));
    arr = arr.sort((a,b)=>a.dist-b.dist);

    for(let i=0; i<50 && i<arr.length; i++) {
        let a = viewer.createLabel();
        a.setText("node#"+arr[i].i);
        a.parent = arr[i].nd.ball;
        arr[i].nd.label = a;
    }
    */


});


function hTranslate(direction, amount) {
    tree.transform(viewer.toWorldMatrix(H3.makeH3Translation(direction, amount)));
}

function rotate(angle) {
    tree.transform(viewer.toWorldMatrix(BABYLON.Matrix.RotationY(angle)));
}

