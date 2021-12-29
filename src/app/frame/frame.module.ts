import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FrameRoutingModule } from './frame-routing.module';
import { FrameComponent } from './frame.component';


@NgModule({
  declarations: [
    FrameComponent
  ],
  imports: [
    CommonModule,
    FrameRoutingModule
  ]
})
/**
 * ATTENTION!
 * This moudle is not used until now
 */
export class FrameModule { }
