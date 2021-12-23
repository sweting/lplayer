import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewComponent } from './overview/overview.component';

const routes: Routes = [
  { path: '', redirectTo: '/lconfiguration', pathMatch: 'full' },
  { path: 'lframe', loadChildren: () => import('./frame/frame.module').then(m => m.FrameModule) },
  { path: 'lconfiguration', loadChildren: () => import('./configuration/configuration.module').then(m => m.ConfigurationModule) },
  { path: ':station_name', component: OverviewComponent, data: { icecastMeta: false } },
  { path: ':station_name/frame', component: OverviewComponent, data: { icecastMeta: false, isFrame: true } },
  { path: ':station_name/frame/:config', component: OverviewComponent, data: { icecastMeta: false, isFrame: true } },
  { path: ':station_name/direct', component: OverviewComponent, data: { icecastMeta: true } },
  { path: ':station_name/:config', component: OverviewComponent, data: {icecastMeta: false} },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
