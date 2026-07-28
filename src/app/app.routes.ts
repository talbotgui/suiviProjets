import { Routes } from '@angular/router';
import { SqmShellComponent } from './composants/shell/shell.component';
import { SqmAccueilComponent } from './ecrans/accueil/accueil.component';
import { SqmAdministrationComponent } from './ecrans/administration/administration.component';
import { SqmBrouillonComponent } from './ecrans/audits/brouillon/brouillon.component';
import { SqmConstitutionCampagneComponent } from './ecrans/audits/constitution-campagne/constitution-campagne.component';
import { SqmTableauDeBordComponent } from './ecrans/audits/tableau-de-bord/tableau-de-bord.component';
import { SqmComparaisonAuditsComponent } from './ecrans/comparaison-audits/comparaison-audits.component';
import { SqmFicheProjetComponent } from './ecrans/fiche-projet/fiche-projet.component';
import { SqmListeTravailComponent } from './ecrans/liste-travail/liste-travail.component';
import { SqmParametrageComponent } from './ecrans/parametrage/parametrage.component';
import { SqmSyntheseAuditsComponent } from './ecrans/synthese-audits/synthese-audits.component';
import { SqmSyntheseGraphiqueComponent } from './ecrans/synthese-graphique/synthese-graphique.component';

// Toutes les routes de l'application sont désormais des routes enfants de `ShellComponent` (Phase 6, incrément 3),
// qui porte la sidebar et la barre supérieure communes (`docs/02_documentation/08_arborescenceNavigation.md`) :
// résorbe la dette signalée jusqu'ici à cet endroit (Administration seule route racine, faute d'écran d'Accueil).
// Chaque route enfant conserve exactement le même chemin d'URL et le même composant qu'auparavant (aucun
// changement de comportement observable pour les écrans existants), seule la redirection de la route racine change
// (`administration` → `accueil`, désormais construit).
//
// Route `synthese-audits` ajoutée à la Phase 6, incrément 4 (US-015, `SqmSyntheseAuditsComponent`).
//
// Route `fiche-projet/:projetId` ajoutée à la Phase 6, incrément 5 (US-017, `SqmFicheProjetComponent`), câblée
// depuis `SqmSyntheseAuditsComponent.activerLigne` (jusqu'ici volontairement vide, en attente de cet écran). Premier
// segment de route paramétré du projet : le paramètre `projetId` est lié directement à l'`input()` homonyme du
// composant via `withComponentInputBinding()` (`app.config.ts`), sans lecture manuelle d'`ActivatedRoute`.
//
// Route `comparaison-audits/:projetId` ajoutée à la Phase 6, incrément 6 (US-018, `SqmComparaisonAuditsComponent`),
// sur le modèle exact de `fiche-projet/:projetId` : le lien d'action « Comparer à un autre audit » de
// `SqmFicheProjetComponent` pointait déjà vers cette route par anticipation depuis l'incrément 5.
//
// Route `synthese-graphique` ajoutée à la Phase 6, incrément 7 (US-016, `SqmSyntheseGraphiqueComponent`), sur le
// modèle exact de `synthese-audits` (route enfant sans paramètre, entrée de sidebar désormais active).
//
// Route `parametrage` ajoutée à la Phase 7, incrément 2 (US-033, `SqmParametrageComponent`), sur le même modèle
// (route enfant sans paramètre, entrée de sidebar désormais active).
//
// Route `liste-travail` ajoutée à la Phase 8 (US-020, `SqmListeTravailComponent`), sur le même modèle.
//
// Note de relecture (décision toujours provisoire, comme l'était déjà la précédente redirection vers
// `administration`, cf. `docs/04_rapports/rapportDeDeveloppement.md#étape-3--administration-du-modèle`) :
// `08_arborescenceNavigation.md` documente `Accueil` (résumé) comme un écran de la sidebar du shell, mais fait
// atterrir explicitement l'utilisateur, à l'ouverture d'un fichier existant, sur Liste de travail (si alertes non
// traitées) ou Synthèse des audits (sinon). Les deux écrans cibles existent désormais (Liste de travail depuis
// cette phase), mais aucun écran de sélection/ouverture de fichier n'est encore construit dans ce dépôt (US-001,
// US-002, cf. commentaire d'en-tête de `accueil.component.ts`) : `accueil` reste donc ici le meilleur repli
// disponible, pas le point d'entrée définitif prescrit par la documentation. À corriger lorsque cet écran de
// sélection de fichier sera construit, en y câblant la redirection conditionnelle (présence d'alertes non
// traitées) plutôt qu'une route statique.
export const routes: Routes = [
  {
    path: '',
    component: SqmShellComponent,
    children: [
      { path: 'accueil', component: SqmAccueilComponent },
      { path: 'synthese-audits', component: SqmSyntheseAuditsComponent },
      { path: 'synthese-graphique', component: SqmSyntheseGraphiqueComponent },
      { path: 'liste-travail', component: SqmListeTravailComponent },
      { path: 'fiche-projet/:projetId', component: SqmFicheProjetComponent },
      { path: 'comparaison-audits/:projetId', component: SqmComparaisonAuditsComponent },
      { path: 'administration', component: SqmAdministrationComponent },
      { path: 'audits/constitution-campagne', component: SqmConstitutionCampagneComponent },
      { path: 'audits/tableau-de-bord', component: SqmTableauDeBordComponent },
      { path: 'audits/brouillon', component: SqmBrouillonComponent },
      { path: 'parametrage', component: SqmParametrageComponent },
      { path: '', redirectTo: 'accueil', pathMatch: 'full' },
    ],
  },
];
