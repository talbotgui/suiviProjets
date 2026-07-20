import { Routes } from '@angular/router';
import { SqmAdministrationComponent } from './ecrans/administration/administration.component';

// Décision arbitraire (Phase 3, à signaler dans le rapport de développement) : en l'absence d'écran d'accueil
// (US-001/US-002 n'ont pas encore d'écran), Administration est temporairement le seul écran existant et donc la
// route racine ; à revoir dès que l'écran d'accueil sera construit.
export const routes: Routes = [
  { path: 'administration', component: SqmAdministrationComponent },
  { path: '', redirectTo: 'administration', pathMatch: 'full' },
];
