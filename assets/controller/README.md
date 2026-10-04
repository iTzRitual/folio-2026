# Controller configurator model

`public/glbs/controller.glb` is the unmodified `public/controller.glb` from [iTzRitual/r3f-controller-configurator-2025](https://github.com/iTzRitual/r3f-controller-configurator-2025/tree/7e9c5a6f893e81f2a208f6ca0edda3bf7082de28), imported from commit `7e9c5a6f893e81f2a208f6ca0edda3bf7082de28`.

The asset contains 13 meshes and the original seven materials: Base, Front, touch, backlight, Buttons, Analogs, and Triggers. It needs no external textures or decoder.

`WorkstationController` fits the model to the width in `CONFIG.workstation.CONTROLLER_WIDTH`, centers its footprint, and aligns its lowest vertex with the desk surface. The 197-degree yaw includes the source model's reversed forward direction and the existing 17-degree desk angle. Placement continues to use the controller position from the workstation debug settings. Materials retain their original colors and use the workstation's day/night environment intensity.
