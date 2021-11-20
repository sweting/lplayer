import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewComponent } from './overview/overview.component';

const routes: Routes = [
  {path: '', redirectTo: '/suedwelle', pathMatch: 'full'},
  {path: ':station_name', component: OverviewComponent, data: {icecastMeta: false} },
  {path: ':station_name/direct', component: OverviewComponent, data: {icecastMeta: true} }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
