let viewer;
let tree;

window.addEventListener("DOMContentLoaded", function() {

    viewer = new Viewer('c');
    tree = new TreeModel(viewer.scene);    
    
    viewer.runRenderLoop();

    let scene = viewer.scene;

    scene.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case BABYLON.KeyboardEventTypes.KEYDOWN:
                if(kbInfo.event.key == "ArrowUp") hTranslate(2,-0.1);
                else if(kbInfo.event.key == "ArrowDown") hTranslate(2,0.1);
                else if(kbInfo.event.key == "ArrowLeft") rotate(-0.1);
                else if(kbInfo.event.key == "ArrowRight") rotate(0.1);
                else if(kbInfo.event.key == "w") hTranslate(1,-0.1);
                else if(kbInfo.event.key == "z") hTranslate(1,0.1);
                else if(kbInfo.event.key == "a") hTranslate(0,0.1);
                else if(kbInfo.event.key == "s") hTranslate(0, -0.1);
                else console.log(kbInfo.event.key);
                break;
            case BABYLON.KeyboardEventTypes.KEYUP:
                break;
        }
    });

    scene.onPointerDown = function(evt, pickInfo) {
        if(pickInfo.hit && pickInfo.pickedMesh) {
            let mesh = pickInfo.pickedMesh;
            console.log(mesh.nodeIndex);
            tree.selectNode(mesh.nodeIndex);
        }
    }

});

function hTranslate(direction, amount) {
    tree.transform(viewer.toWorldMatrix(H3.makeH3Translation(direction, amount)));
}

function rotate(angle) {
    tree.transform(viewer.toWorldMatrix(BABYLON.Matrix.RotationY(angle)));
}
