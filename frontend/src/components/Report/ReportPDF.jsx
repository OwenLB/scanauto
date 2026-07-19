import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const C = {
  text:        '#171717',
  secondary:   '#525252',
  tertiary:    '#a3a3a3',
  border:      '#e4e4e7',
  surface:     '#f4f4f5',
  green:       '#16a34a',
  greenBg:     '#f0fdf4',
  amber:       '#d97706',
  amberBg:     '#fffbeb',
  red:         '#dc2626',
  redBg:       '#fef2f2',
  blue:        '#2563eb',
  blueBg:      '#eff6ff',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.text,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: C.tertiary },

  section:      { marginBottom: 12 },
  sectionTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, color: C.tertiary, marginBottom: 6, textTransform: 'uppercase' },

  card: { border: '1pt solid #e4e4e7', borderRadius: 5, padding: 10, marginBottom: 6, backgroundColor: '#ffffff' },

  row:        { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  h1:   { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  h2:   { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  h3:   { fontSize: 9,  fontFamily: 'Helvetica-Bold' },
  body: { fontSize: 9, lineHeight: 1.5 },
  sm:   { fontSize: 8, color: C.secondary },
  xs:   { fontSize: 7, color: C.tertiary },
  mono: { fontFamily: 'Courier', fontSize: 8.5 },

  sep: { height: 1, backgroundColor: C.border, marginVertical: 8 },

  alertRed:   { backgroundColor: C.redBg,   borderLeft: '3pt solid #dc2626', padding: 7, marginBottom: 4, borderRadius: 3 },
  alertAmber: { backgroundColor: C.amberBg, borderLeft: '3pt solid #d97706', padding: 7, marginBottom: 4, borderRadius: 3 },
  alertGreen: { backgroundColor: C.greenBg, borderLeft: '3pt solid #16a34a', padding: 7, marginBottom: 4, borderRadius: 3 },

  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3.5, borderBottom: '1pt solid #e4e4e7' },

  badgeGreen: { backgroundColor: C.greenBg, color: C.green, fontSize: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  badgeBlue:  { backgroundColor: C.blueBg,  color: C.blue,  fontSize: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  badgeAmber: { backgroundColor: C.amberBg, color: C.amber, fontSize: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  badgeRed:   { backgroundColor: C.redBg,   color: C.red,   fontSize: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
})

const verdictBadgeStyle = { 'Excellent': styles.badgeGreen, 'Bon': styles.badgeBlue, 'Moyen': styles.badgeAmber, 'Risqué': styles.badgeRed }
const verdictColor = { 'Excellent': C.green, 'Bon': C.blue, 'Moyen': C.amber, 'Risqué': C.red }

const str = (v) => v == null ? '' : String(v)
const fmt = (n) => n != null && n !== '' ? Number(n).toLocaleString('fr-FR') : '—'

const CRITERIA = [
  { key: 'kilometrage',    label: 'Kilométrage', max: 25 },
  { key: 'fiabilite',      label: 'Fiabilité',   max: 25 },
  { key: 'historique',     label: 'Historique',  max: 20 },
  { key: 'signaux_vendeur',label: 'Vendeur',      max: 15 },
  { key: 'prix_marche',    label: 'Prix marché',  max: 15 },
]

function ScoreBar({ score, max }) {
  const pct = Math.min((score / max) * 100, 100)
  const color = pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red
  return (
    <View style={{ height: 3, backgroundColor: C.border, borderRadius: 2, marginTop: 3 }}>
      <View style={{ height: 3, width: `${pct}%`, backgroundColor: color, borderRadius: 2 }} />
    </View>
  )
}

function Footer({ today }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>ScanAuto — Rapport d'analyse</Text>
      <Text style={styles.footerText}>{today}</Text>
    </View>
  )
}

export default function ReportPDF({ r1, r2, r3, r4, r5, vehicule }) {
  const v   = r1?.vehicule_identifie || {}
  const vdr = r1?.vendeur || {}
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const title = `ScanAuto — ${v.marque || ''} ${v.modele || ''} ${v.annee || ''}`.trim()

  return (
    <Document title={title}>

      {/* ─── PAGE 1 — Header + Score + Fiabilité ─────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Footer today={today} />

        {/* Header */}
        <View style={[styles.section, { marginBottom: 14 }]}>
          <View style={styles.rowBetween}>
            {/* Left — vehicle identity */}
            <View style={{ flex: 1, marginRight: 20 }}>
              <Text style={[styles.h1, { fontSize: 18, lineHeight: 1.2 }]}>
                {v.marque} {v.modele}
                {v.finition ? ` — ${v.finition}` : ''}
              </Text>
              <Text style={[styles.sm, { marginTop: 4 }]}>
                {[v.annee, v.carburant, v.boite].filter(Boolean).join(' · ')}
                {v.kilometrage ? `  ·  ${fmt(v.kilometrage)} km` : ''}
                {v.km_par_an  ? ` (${fmt(v.km_par_an)} km/an)` : ''}
              </Text>
              {v.bloc_moteur?.designation && (
                <Text style={[styles.mono, { fontSize: 7.5, color: C.tertiary, marginTop: 3 }]}>
                  {v.bloc_moteur.designation}
                  {v.bloc_moteur.code ? ` (${v.bloc_moteur.code})` : ''}
                  {v.bloc_moteur.puissance_ch ? ` · ${v.bloc_moteur.puissance_ch} ch` : ''}
                </Text>
              )}
              <View style={[styles.sep, { marginTop: 10, marginBottom: 8 }]} />
              <View style={[styles.row, { alignItems: 'baseline' }]}>
                <Text style={[styles.h2, { fontSize: 20 }]}>{fmt(v.prix)} €</Text>
                <Text style={[styles.xs, { marginLeft: 10 }]}>{today}</Text>
              </View>
            </View>

            {/* Right — score block */}
            {r2 && (
              <View style={{ alignItems: 'center', width: 72, backgroundColor: C.surface, borderRadius: 6, padding: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 34, fontFamily: 'Helvetica-Bold', color: verdictColor[r2.verdict] || C.amber, lineHeight: 1 }}>
                    {r2.score_global}
                  </Text>
                  <Text style={{ fontSize: 10, color: C.tertiary, marginBottom: 3, marginLeft: 1 }}>
                    /100
                  </Text>
                </View>
                <View style={{ marginTop: 6, backgroundColor: verdictColor[r2.verdict] || C.amber, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 7, color: '#ffffff', fontFamily: 'Helvetica-Bold' }}>
                    {r2.verdict?.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sep} />

        {/* Synthèse IA */}
        {r2?.synthese_ia && (
          <View style={[styles.section, { backgroundColor: C.surface, borderRadius: 5, padding: 10 }]}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Synthèse</Text>
            <Text style={styles.body}>{r2.synthese_ia}</Text>
          </View>
        )}

        {/* Critères */}
        {r2?.criteres && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Critères de scoring</Text>
            <View style={styles.card}>
              {CRITERIA.map(({ key, label, max }) => {
                const c = r2.criteres[key]
                if (!c) return null
                const pct = Math.min((c.score / max) * 100, 100)
                const col = pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red
                return (
                  <View key={key} style={{ marginBottom: 7 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sm}>{label}{c.statut === 'incomplet' ? ' ?' : ''}</Text>
                      <Text style={[styles.mono, { color: col }]}>{c.score}/{max}</Text>
                    </View>
                    <ScoreBar score={c.score} max={max} />
                    {c.justification && (
                      <Text style={[styles.xs, { marginTop: 2 }]}>{c.justification}</Text>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Fiabilité moteur */}
        {r2?.fiabilite_moteur && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fiabilité moteur — {r2.fiabilite_moteur.bloc}</Text>
            <View style={styles.card}>
              {r2.fiabilite_moteur.analyse_narrative && (
                <Text style={[styles.body, { marginBottom: 8 }]}>{r2.fiabilite_moteur.analyse_narrative}</Text>
              )}
              {r2.fiabilite_moteur.points_forts?.length > 0 && (
                <View style={{ marginBottom: 7 }}>
                  <Text style={[styles.h3, { color: C.green, marginBottom: 3 }]}>Points forts</Text>
                  {r2.fiabilite_moteur.points_forts.map((p, i) => (
                    <Text key={i} style={[styles.sm, { marginBottom: 2 }]}>✓  {str(p)}</Text>
                  ))}
                </View>
              )}
              {r2.fiabilite_moteur.defauts_connus?.map((d, i) => (
                <View key={i} style={styles.alertAmber}>
                  <Text style={[styles.h3, { color: C.amber }]}>{d.defaut}</Text>
                  <Text style={[styles.sm, { marginTop: 2 }]}>{d.description}</Text>
                  {d.kilometrage_critique && (
                    <Text style={[styles.mono, { fontSize: 7.5, marginTop: 2 }]}>{d.kilometrage_critique}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>

      {/* ─── PAGE 2 — Vigilance + Coûts ──────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Footer today={today} />

        {/* Points de vigilance */}
        {r3?.points_vigilance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points de vigilance</Text>
            {r3.points_vigilance.critiques?.map((p, i) => (
              <View key={i} style={styles.alertRed}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.h3, { color: C.red }]}>{p.titre}</Text>
                  {p.cout_estime_min > 0 && (
                    <Text style={[styles.mono, { color: C.red }]}>
                      {fmt(p.cout_estime_min)}–{fmt(p.cout_estime_max)} €
                    </Text>
                  )}
                </View>
                <Text style={[styles.sm, { marginTop: 2 }]}>{p.description}</Text>
                {p.consequence && (
                  <Text style={[styles.xs, { color: C.red, marginTop: 2 }]}>{p.consequence}</Text>
                )}
              </View>
            ))}
            {r3.points_vigilance.a_surveiller?.map((p, i) => (
              <View key={i} style={styles.alertAmber}>
                <Text style={[styles.h3, { color: C.amber }]}>{p.titre}</Text>
                <Text style={[styles.sm, { marginTop: 2 }]}>{p.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sécurité */}
        {r3?.securite && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sécurité & Rappels constructeur</Text>
            <View style={styles.card}>
              {r3.securite.aucun_rappel_majeur ? (
                <Text style={[styles.sm, { color: C.green }]}>✓  Aucun rappel constructeur majeur identifié</Text>
              ) : r3.securite.rappels_constructeur?.length > 0 && (
                <View>
                  <Text style={[styles.h3, { color: C.red, marginBottom: 4 }]}>Rappels constructeur</Text>
                  {r3.securite.rappels_constructeur.map((r, i) => (
                    <Text key={i} style={[styles.sm, { marginBottom: 2 }]}>· {str(r)}</Text>
                  ))}
                </View>
              )}
              {r3.securite.risque_vol && (
                <Text style={[styles.sm, { marginTop: 6 }]}>Risque vol : {r3.securite.risque_vol}</Text>
              )}
              {r3.securite.conseil_securite_paiement && (
                <Text style={[styles.sm, { color: C.amber, marginTop: 4 }]}>
                  {r3.securite.conseil_securite_paiement}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Coûts prévisionnels */}
        {r3?.couts_previsionnels && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coûts prévisionnels</Text>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sm}>Entretien annuel estimé</Text>
                <Text style={[styles.mono, { fontFamily: 'Helvetica-Bold' }]}>
                  {fmt(r3.couts_previsionnels.entretien_annuel_min)}–{fmt(r3.couts_previsionnels.entretien_annuel_max)} €/an
                </Text>
              </View>

              {r3.couts_previsionnels.total_travaux_imminents_min > 0 && (
                <View style={[styles.rowBetween, { marginTop: 6, padding: 6, backgroundColor: C.redBg, borderRadius: 4 }]}>
                  <Text style={[styles.sm, { color: C.red }]}>Budget travaux imminents</Text>
                  <Text style={[styles.mono, { color: C.red, fontFamily: 'Courier-Bold' }]}>
                    {fmt(r3.couts_previsionnels.total_travaux_imminents_min)}–{fmt(r3.couts_previsionnels.total_travaux_imminents_max)} €
                  </Text>
                </View>
              )}

              {r3.couts_previsionnels.travaux_imminents?.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.h3, { marginBottom: 5 }]}>Travaux imminents</Text>
                  {r3.couts_previsionnels.travaux_imminents.map((t, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.sm}>{t.intervention}</Text>
                      <Text style={styles.mono}>{fmt(t.cout_min)}–{fmt(t.cout_max)} €</Text>
                    </View>
                  ))}
                </View>
              )}

              {r3.couts_previsionnels.travaux_long_terme?.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.h3, { marginBottom: 5 }]}>Moyen / Long terme</Text>
                  {r3.couts_previsionnels.travaux_long_terme.map((t, i) => (
                    <View key={i} style={styles.tableRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sm}>{t.intervention}</Text>
                        <Text style={[styles.xs, { marginTop: 1 }]}>{t.horizon}</Text>
                      </View>
                      <Text style={styles.mono}>{fmt(t.cout_min)}–{fmt(t.cout_max)} €</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </Page>

      {/* ─── PAGE 3 — Prix, Infos pratiques ──────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Footer today={today} />

        {/* Prix & Négociation */}
        {r4 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prix & Négociation</Text>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sm}>Fourchette marché</Text>
                <Text style={[styles.mono, { fontFamily: 'Courier-Bold', fontSize: 11 }]}>
                  {fmt(r4.analyse_prix?.fourchette_marche_min)} – {fmt(r4.analyse_prix?.fourchette_marche_max)} €
                </Text>
              </View>
              {r4.analyse_prix?.positionnement_pourcentage !== 0 && (
                <Text style={[styles.xs, { marginTop: 2 }]}>
                  {r4.analyse_prix?.positionnement_pourcentage > 0 ? '+' : ''}
                  {r4.analyse_prix?.positionnement_pourcentage}% vs marché
                </Text>
              )}
              {r4.analyse_prix?.commentaire_age_annonce && (
                <Text style={[styles.sm, { color: C.amber, marginTop: 6 }]}>
                  {r4.analyse_prix.commentaire_age_annonce}
                </Text>
              )}

              {r4.negociation && (
                <>
                  <View style={styles.sep} />
                  <View style={styles.rowBetween}>
                    <Text style={styles.h3}>Prix cible recommandé</Text>
                    <Text style={[styles.mono, { fontFamily: 'Courier-Bold', fontSize: 14, color: C.green }]}>
                      {fmt(r4.negociation.prix_cible)} €
                    </Text>
                  </View>
                  {r4.negociation.economie_potentielle > 0 && (
                    <Text style={[styles.sm, { color: C.green, marginTop: 2 }]}>
                      Économie potentielle : {fmt(r4.negociation.economie_potentielle)} €
                    </Text>
                  )}
                  {r4.negociation.arguments?.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      {r4.negociation.arguments.map((arg, i) => (
                        <View key={i} style={[styles.rowBetween, { paddingVertical: 3 }]}>
                          <Text style={[styles.sm, { flex: 1, marginRight: 8 }]}>– {arg.argument}</Text>
                          <Text style={[styles.mono, { color: C.red }]}>−{fmt(arg.impact_euros)} €</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* Projection décote */}
        {r4?.projection_decote && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projection décote</Text>
            <View style={[styles.row, { marginBottom: 6 }]}>
              <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 4, padding: 8, marginRight: 6, alignItems: 'center' }}>
                <Text style={styles.xs}>Dans 2 ans</Text>
                <Text style={[styles.mono, { fontFamily: 'Courier-Bold', marginTop: 3 }]}>
                  {fmt(r4.projection_decote.valeur_2_ans_min)}–{fmt(r4.projection_decote.valeur_2_ans_max)} €
                </Text>
                <Text style={[styles.xs, { color: C.red }]}>−{r4.projection_decote.pourcentage_2_ans}%</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 4, padding: 8, alignItems: 'center' }}>
                <Text style={styles.xs}>Dans 5 ans</Text>
                <Text style={[styles.mono, { fontFamily: 'Courier-Bold', marginTop: 3 }]}>
                  {fmt(r4.projection_decote.valeur_5_ans_min)}–{fmt(r4.projection_decote.valeur_5_ans_max)} €
                </Text>
                <Text style={[styles.xs, { color: C.red }]}>−{r4.projection_decote.pourcentage_5_ans}%</Text>
              </View>
            </View>
            {r4.projection_decote.commentaire_revendabilite && (
              <Text style={styles.sm}>{r4.projection_decote.commentaire_revendabilite}</Text>
            )}
          </View>
        )}

        {/* Infos pratiques */}
        {r5 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations pratiques</Text>
            <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
              {r5.critair && (
                <View style={[styles.card, { flex: 1, minWidth: 110, marginBottom: 0 }]}>
                  <Text style={[styles.h3, { marginBottom: 4 }]}>Crit'Air</Text>
                  <Text style={styles.sm}>Classe {r5.critair.classe} — {r5.critair.couleur}</Text>
                  <Text style={[styles.xs, { marginTop: 2 }]}>{r5.critair.zfe_statut_2026}</Text>
                  {r5.critair.zfe_details?.slice(0, 3).map((z, i) => (
                    <Text key={i} style={[styles.xs, { marginTop: 1 }]}>{z.ville} : {z.statut}</Text>
                  ))}
                </View>
              )}
              {r5.assurance && (
                <View style={[styles.card, { flex: 1, minWidth: 110, marginBottom: 0 }]}>
                  <Text style={[styles.h3, { marginBottom: 4 }]}>Assurance</Text>
                  <Text style={styles.sm}>Tous risques : {r5.assurance.tous_risques_min}–{r5.assurance.tous_risques_max} €/m</Text>
                  <Text style={[styles.sm, { marginTop: 2 }]}>Au tiers : {r5.assurance.au_tiers_min}–{r5.assurance.au_tiers_max} €/m</Text>
                </View>
              )}
              {r5.carte_grise && (
                <View style={[styles.card, { flex: 1, minWidth: 110, marginBottom: 0 }]}>
                  <Text style={[styles.h3, { marginBottom: 4 }]}>Carte grise</Text>
                  <Text style={styles.sm}>{r5.carte_grise.cv_fiscaux} CV fiscaux</Text>
                  {r5.carte_grise.reduction_age && (
                    <Text style={[styles.sm, { color: C.green }]}>Réduction +10 ans</Text>
                  )}
                  <Text style={[styles.h3, { marginTop: 4 }]}>≈ {fmt(r5.carte_grise.total_estime)} €</Text>
                </View>
              )}
              {r5.consommation && (
                <View style={[styles.card, { flex: 1, minWidth: 110, marginBottom: 0 }]}>
                  <Text style={[styles.h3, { marginBottom: 4 }]}>Consommation</Text>
                  <Text style={styles.sm}>Ville {r5.consommation.ville}  ·  Mixte {r5.consommation.mixte}  ·  Route {r5.consommation.route}</Text>
                  <Text style={[styles.mono, { fontSize: 8, marginTop: 4 }]}>Plein ≈ {fmt(r5.consommation.cout_plein_estime)} €</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Page>

      {/* ─── PAGE 4 — Message, Questions, Checklist, Récap annonce ───── */}
      <Page size="A4" style={styles.page}>
        <Footer today={today} />

        {/* Message vendeur */}
        {r4?.message_vendeur && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message à envoyer au vendeur</Text>
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <Text style={[styles.mono, { fontSize: 8, lineHeight: 1.7 }]}>{r4.message_vendeur}</Text>
            </View>
          </View>
        )}

        {/* Questions vendeur */}
        {r4?.questions_vendeur?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Questions à poser au vendeur</Text>
            <View style={styles.card}>
              {[...r4.questions_vendeur].sort((a, b) => a.priorite - b.priorite).map((q, i) => (
                <View key={i} style={[styles.tableRow, { paddingVertical: 5 }]}>
                  <Text style={[styles.xs, { width: 12, fontFamily: 'Courier' }]}>{q.priorite}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sm}>{q.question}</Text>
                    {q.point_vigilance_associe && (
                      <Text style={[styles.xs, { marginTop: 1 }]}>{q.point_vigilance_associe}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Checklist spécifique modèle */}
        {r3?.checklist_inspection?.specifique_modele?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Points spécifiques à vérifier — {r2?.fiabilite_moteur?.bloc || 'ce modèle'}
            </Text>
            <View style={styles.card}>
              {r3.checklist_inspection.specifique_modele.map((item, i) => (
                <View key={i} style={[styles.row, { paddingVertical: 3.5, borderBottom: i < r3.checklist_inspection.specifique_modele.length - 1 ? '1pt solid #e4e4e7' : 'none' }]}>
                  <Text style={[styles.xs, { width: 14 }]}>☐</Text>
                  <Text style={[styles.sm, { flex: 1 }]}>{str(item)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Récap annonce */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récap annonce</Text>
          <View style={styles.row}>
            <View style={[styles.card, { flex: 1, marginRight: 6, marginBottom: 0 }]}>
              <Text style={[styles.h3, { marginBottom: 5 }]}>Véhicule</Text>
              {[
                ['CT valide', v.ct_valide === true ? 'Oui ✓' : v.ct_valide === false ? 'Non ✗' : str(v.ct_valide)],
                ['Carnet',     str(v.carnet_entretien)],
                ['Propriétaires', str(v.nb_proprietaires)],
                ['Cohérence KM',  str(v.coherence_kilometrage)],
              ].filter(([, val]) => val).map(([label, val], i) => (
                <View key={i} style={[styles.tableRow, { paddingVertical: 3 }]}>
                  <Text style={styles.xs}>{label}</Text>
                  <Text style={styles.sm}>{val}</Text>
                </View>
              ))}
            </View>

            {vdr.type && (
              <View style={[styles.card, { flex: 1, marginBottom: 0 }]}>
                <Text style={[styles.h3, { marginBottom: 5 }]}>Vendeur</Text>
                {[
                  ['Type',        str(vdr.type)],
                  ['Lieu',        str(vdr.localisation)],
                  ['Âge annonce', vdr.age_annonce_jours ? `${vdr.age_annonce_jours} j` : ''],
                  ['Ton',         str(vdr.ton_annonce)],
                ].filter(([, val]) => val).map(([label, val], i) => (
                  <View key={i} style={[styles.tableRow, { paddingVertical: 3 }]}>
                    <Text style={styles.xs}>{label}</Text>
                    <Text style={styles.sm}>{val}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {r1?.infos_manquantes?.filter(i => i.impact !== 'mineur').length > 0 && (
            <View style={[styles.card, { marginTop: 6, marginBottom: 0 }]}>
              <Text style={[styles.h3, { marginBottom: 5 }]}>Infos manquantes</Text>
              {r1.infos_manquantes.filter(i => i.impact !== 'mineur').map((info, i) => (
                <Text key={i} style={[styles.sm, { color: info.impact === 'critique' ? C.red : C.amber, marginBottom: 2 }]}>
                  · {info.champ} ({info.impact})
                </Text>
              ))}
            </View>
          )}

          {r1?.options_detectees?.length > 0 && (
            <View style={[styles.card, { marginTop: 6, marginBottom: 0 }]}>
              <Text style={[styles.h3, { marginBottom: 4 }]}>Options détectées</Text>
              <Text style={styles.sm}>
                {r1.options_detectees.map(o => o.nom).join('  ·  ')}
              </Text>
            </View>
          )}
        </View>
      </Page>

    </Document>
  )
}
