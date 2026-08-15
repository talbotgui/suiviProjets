// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Façade de commandes : frontière unique entre l'interface Angular et le cœur natif (cf.
//! `docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités`).
//!
//! Périmètre de la Phase 1 : commandes strictement nécessaires à la création, au chargement, à la sauvegarde et au
//! verrouillage/déverrouillage du fichier de données (US-001, US-002, US-026). Périmètre de la Phase 2 : saisie en
//! mémoire des credentials et test de connectivité (US-003, US-004). Périmètre de la Phase 4 : qualification des
//! membres connus d'un groupe et politique d'autorisation de l'IA d'un projet (US-022 à US-024). Périmètre de la
//! Phase 5, incrément 1 : dix opérations d'interrogation des indicateurs GitLab/Sonar déterministes du Moteur
//! d'audit (US-009). Périmètre de la Phase 5, incrément 2 : cycle de vie du brouillon d'une campagne
//! (`enregistrerBrouillon`, `integrerBrouillon`, `rejeterBrouillon`, US-014, RG-019). Périmètre de la Phase 7,
//! incrément 1 : modification d'un seuil de couleur et d'un référentiel (`definirSeuil`, `definirReferentiel`,
//! US-033, RG-022, RG-023, RG-030). Périmètre de la Phase 7, incrément 4 : prévisualisation et exécution d'une
//! purge d'audits anciens par densité ou par âge (`previsualiserPurgeDensite`, `executerPurgeDensite`,
//! `previsualiserPurgeAge`, `executerPurgeAge`, US-025, RG-024, RG-025). Périmètre de la Phase 8 : création d'une
//! annotation et qualification d'une alerte (`creerAnnotation`, `qualifierAlerte`, US-019, US-020, RG-026).
//! Périmètre de la Phase 9, incrément 1 : ajout/mise à jour et suppression d'une vue enregistrée (`definirVue`,
//! `supprimerVue`, US-028, RG-027). La Façade n'est jamais testée isolément : chaque commande délègue au module qu'elle route
//! (Moteur de persistance, Connecteur GitLab/Sonar), déjà couvert par ses propres tests unitaires (cf.
//! `docs/02_documentation/16_normesTests.md#tests-unitaires`).

pub(crate) mod administration;
pub(crate) mod alertes;
pub(crate) mod audit;
pub(crate) mod configuration_partageable;
pub(crate) mod connectivite;
pub(crate) mod diagnostic;
pub(crate) mod etat_session;
pub(crate) mod fichier;
pub(crate) mod parametrage;
pub(crate) mod purge;
pub(crate) mod vues;
