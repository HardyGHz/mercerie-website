export type InstrumentCategory = 'genomics' | 'protein' | 'systems' | 'clinical' | 'literature' | 'utility'
export type InstrumentStatus = 'active' | 'beta' | 'coming-soon'

export interface InstrumentInput {
  id: string
  label: string
  placeholder: string
  required?: boolean
  type?: 'text' | 'select'
  options?: string[]
}

export interface Instrument {
  id: string
  name: string
  category: InstrumentCategory
  icon: string
  tagline: string
  inputLabel: string
  outputLabel: string
  inputs: InstrumentInput[]
  status: InstrumentStatus
  chainTo: string[]
}

export const CATEGORY_META: Record<InstrumentCategory, { color: string; bg: string; label: string; desc: string }> = {
  genomics:   { color: '#4edea3', bg: '#4edea3/10', label: 'GENOMICS',   desc: 'Variant databases, gene browsers, population frequency tools — ClinVar, gnomAD, Ensembl, dbSNP' },
  protein:    { color: '#c0c1ff', bg: '#c0c1ff/10', label: 'PROTEIN',    desc: 'Structure retrieval, domain analysis, interaction networks — PDB, AlphaFold, UniProt, STRING' },
  systems:    { color: '#adc6ff', bg: '#adc6ff/10', label: 'SYSTEMS',    desc: 'Pathway mapping, network analysis, gene ontology enrichment — KEGG, Reactome, STRING' },
  clinical:   { color: '#f59e0b', bg: '#f59e0b/10', label: 'CLINICAL',   desc: 'Trial registries, drug-target databases, approval tracking — ClinicalTrials.gov, DrugBank, ChEMBL' },
  literature: { color: '#adc6ff', bg: '#adc6ff/10', label: 'LITERATURE', desc: 'Biomedical literature search, citation networks, preprint access — PubMed, bioRxiv, Semantic Scholar' },
  utility:    { color: '#8c909f', bg: '#8c909f/10', label: 'UTILITY',    desc: 'Format conversion, ID mapping, sequence tools — BLAST, BioMart, Entrez ID mapper' },
}

export const INSTRUMENTS: Instrument[] = [
  // ── GENOMICS ───────────────────────────────────────────────────────────────
  {
    id: 'ensembl-database', name: 'Ensembl Database', category: 'genomics', icon: 'dna',
    tagline: 'Gene & transcript lookup, VEP variant annotation, sequence fetch',
    inputLabel: 'Gene symbol or Transcript ID', outputLabel: 'Sequence, exons, VEP annotations',
    inputs: [
      { id: 'gene_id', label: 'GENE / TRANSCRIPT ID', placeholder: 'e.g. TP53, ENSG00000141510', required: true },
      { id: 'species', label: 'SPECIES', placeholder: 'homo_sapiens', type: 'select', options: ['homo_sapiens', 'mus_musculus', 'danio_rerio'] },
    ],
    status: 'coming-soon', chainTo: ['gnomad-database', 'clinvar-database'],
  },
  {
    id: 'dbsnp-database', name: 'dbSNP Database', category: 'genomics', icon: 'manage_search',
    tagline: 'Short variant lookup by rsID — coordinates, allele freq, gene links',
    inputLabel: 'rsID or HGVS notation', outputLabel: 'Coordinates, allele frequencies, gene context',
    inputs: [
      { id: 'rsid', label: 'RS ID / HGVS', placeholder: 'e.g. rs121918719', required: true },
    ],
    status: 'coming-soon', chainTo: ['clinvar-database', 'gnomad-database'],
  },
  {
    id: 'gnomad-database', name: 'gnomAD Database', category: 'genomics', icon: 'bar_chart',
    tagline: 'Population allele frequencies and gene loss-of-function intolerance (pLI, LOEUF)',
    inputLabel: 'Variant coordinates or gene symbol', outputLabel: 'Allele freq, LOEUF/pLI scores',
    inputs: [
      { id: 'variant', label: 'VARIANT / GENE', placeholder: 'e.g. 17-7674220-C-T or TP53', required: true },
      { id: 'dataset', label: 'DATASET', placeholder: 'gnomad_r4', type: 'select', options: ['gnomad_r4', 'gnomad_r3', 'gnomad_r2_1'] },
    ],
    status: 'coming-soon', chainTo: ['clinvar-database', 'alphagenome-single-variant-analysis'],
  },
  {
    id: 'alphagenome-single-variant-analysis', name: 'AlphaGenome', category: 'genomics', icon: 'neurology',
    tagline: 'AI-based prediction of non-coding variant regulatory effects (RNA, chromatin, TF)',
    inputLabel: 'Variant (chr:pos:ref>alt) + cell type', outputLabel: 'Regulatory effect scores',
    inputs: [
      { id: 'variant', label: 'VARIANT', placeholder: 'chr17:7676594:C>T', required: true },
      { id: 'cell_type', label: 'CELL TYPE', placeholder: 'e.g. K562, GM12878' },
    ],
    status: 'coming-soon', chainTo: ['ucsc-conservation-and-tfbs'],
  },
  {
    id: 'ucsc-conservation-and-tfbs', name: 'UCSC Conservation & TFBS', category: 'genomics', icon: 'map',
    tagline: 'Evolutionary conservation scores (phyloP, phastCons) and TF binding sites (ENCODE, JASPAR)',
    inputLabel: 'Genomic region coordinates', outputLabel: 'Conservation scores, TFBS overlaps',
    inputs: [
      { id: 'region', label: 'REGION', placeholder: 'chr17:7674220-7676594', required: true },
      { id: 'assembly', label: 'ASSEMBLY', placeholder: 'hg38', type: 'select', options: ['hg38', 'hg19', 'mm10'] },
    ],
    status: 'coming-soon', chainTo: ['jaspar-database', 'unibind-database'],
  },
  {
    id: 'encode-ccres-database', name: 'ENCODE cCREs', category: 'genomics', icon: 'grid_view',
    tagline: 'Human cis-regulatory elements (promoters, enhancers, insulators) by cell/tissue type',
    inputLabel: 'Cell/tissue type or genomic region', outputLabel: 'cCRE list with activity levels',
    inputs: [
      { id: 'cell_type', label: 'CELL TYPE', placeholder: 'e.g. K562, HepG2', required: true },
      { id: 'region', label: 'REGION (optional)', placeholder: 'chr17:7674220-7676594' },
    ],
    status: 'coming-soon', chainTo: ['gtex-database'],
  },
  {
    id: 'jaspar-database', name: 'JASPAR Database', category: 'genomics', icon: 'pattern',
    tagline: 'TF binding profiles (PFM/PWM matrices) in MEME, YAML formats',
    inputLabel: 'TF name or JASPAR matrix ID', outputLabel: 'Position frequency matrix',
    inputs: [
      { id: 'tf_name', label: 'TF NAME', placeholder: 'e.g. TP53, SP1', required: true },
      { id: 'format', label: 'FORMAT', placeholder: 'MEME', type: 'select', options: ['MEME', 'YAML', 'JASPAR'] },
    ],
    status: 'coming-soon', chainTo: ['unibind-database'],
  },
  {
    id: 'unibind-database', name: 'UniBind Database', category: 'genomics', icon: 'lan',
    tagline: 'Experimentally validated TF binding sites from ChIP-seq data',
    inputLabel: 'TF name, cell line, species', outputLabel: 'Binding site coordinates (BED/FASTA)',
    inputs: [
      { id: 'tf_name', label: 'TF NAME', placeholder: 'e.g. CTCF', required: true },
      { id: 'cell_line', label: 'CELL LINE', placeholder: 'e.g. K562' },
    ],
    status: 'coming-soon', chainTo: [],
  },
  {
    id: 'gtex-database', name: 'GTEx Database', category: 'genomics', icon: 'scatter_plot',
    tagline: 'Tissue-specific gene expression and eQTL data across 54 human tissues',
    inputLabel: 'Gene symbol + tissue type', outputLabel: 'TPM expression, eQTL variants/p-values',
    inputs: [
      { id: 'gene', label: 'GENE SYMBOL', placeholder: 'e.g. TP53', required: true },
      { id: 'tissue', label: 'TISSUE', placeholder: 'e.g. Liver, Brain' },
    ],
    status: 'coming-soon', chainTo: ['ensembl-database'],
  },

  // ── PROTEIN ────────────────────────────────────────────────────────────────
  {
    id: 'uniprot-database', name: 'UniProt Database', category: 'protein', icon: 'category',
    tagline: 'Protein function, sequence, PTMs, and known mutations (Swiss-Prot/TrEMBL)',
    inputLabel: 'Protein name or UniProt ID', outputLabel: 'Function, sequence, PTMs, literature',
    inputs: [
      { id: 'protein_id', label: 'PROTEIN / UNIPROT ID', placeholder: 'e.g. TP53_HUMAN or P04637', required: true },
    ],
    status: 'coming-soon', chainTo: ['alphafold-database-fetch-and-analyze', 'pdb-database'],
  },
  {
    id: 'alphafold-database-fetch-and-analyze', name: 'AlphaFold Database', category: 'protein', icon: 'view_in_ar',
    tagline: 'AI-predicted 3D protein structures — pLDDT confidence profiling, domain boundaries',
    inputLabel: 'UniProt Accession ID', outputLabel: '3D coordinates (PDB/CIF), pLDDT profile',
    inputs: [
      { id: 'uniprot_id', label: 'UNIPROT ACCESSION', placeholder: 'e.g. P04637', required: true },
    ],
    status: 'coming-soon', chainTo: ['pymol', 'foldseek-structural-search'],
  },
  {
    id: 'pdb-database', name: 'PDB Database', category: 'protein', icon: 'deployed_code',
    tagline: 'Experimentally determined 3D macromolecular structures (X-ray, Cryo-EM)',
    inputLabel: 'PDB ID or protein sequence', outputLabel: 'Coordinate files, experimental details',
    inputs: [
      { id: 'pdb_id', label: 'PDB ID', placeholder: 'e.g. 1A8G', required: true },
    ],
    status: 'coming-soon', chainTo: ['pymol', 'foldseek-structural-search'],
  },
  {
    id: 'foldseek-structural-search', name: 'Foldseek', category: 'protein', icon: 'frame_inspect',
    tagline: '3D structural similarity search — find structurally similar proteins regardless of sequence',
    inputLabel: '3D coordinate file (.pdb/.cif)', outputLabel: 'Structurally similar proteins list',
    inputs: [
      { id: 'structure', label: 'STRUCTURE FILE / PDB ID', placeholder: 'e.g. 1A8G or upload .pdb', required: true },
      { id: 'database', label: 'DATABASE', placeholder: 'PDB100', type: 'select', options: ['PDB100', 'AlphaFold/Swiss-Prot', 'AlphaFold/Proteome'] },
    ],
    status: 'coming-soon', chainTo: ['pymol'],
  },
  {
    id: 'protein-sequence-similarity-search', name: 'Protein Similarity Search', category: 'protein', icon: 'compare',
    tagline: 'Sequence-based homology search (BLAST/MMseqs2) for functional annotation',
    inputLabel: 'Protein sequence (FASTA)', outputLabel: 'Homologous sequences with alignment scores',
    inputs: [
      { id: 'sequence', label: 'SEQUENCE (FASTA)', placeholder: 'MEPVDPRLEP...', required: true, type: 'text' },
    ],
    status: 'coming-soon', chainTo: ['protein-sequence-msa', 'uniprot-database'],
  },
  {
    id: 'protein-sequence-msa', name: 'Multiple Sequence Alignment', category: 'protein', icon: 'format_align_left',
    tagline: 'MSA with Clustal Omega — conserved residues, active sites, evolutionary relationships',
    inputLabel: 'Multiple protein sequences (FASTA)', outputLabel: 'Alignment file (MSA)',
    inputs: [
      { id: 'sequences', label: 'SEQUENCES (FASTA)', placeholder: '>seq1\nMEPVD...\n>seq2\nMEPVA...', required: true },
    ],
    status: 'coming-soon', chainTo: ['interpro-database'],
  },
  {
    id: 'interpro-database', name: 'InterPro Database', category: 'protein', icon: 'device_hub',
    tagline: 'Protein domain families, active sites, and Deep Learning functional annotation',
    inputLabel: 'Protein ID or sequence', outputLabel: 'Domain structure (IDA), InterPro families, GO terms',
    inputs: [
      { id: 'protein_id', label: 'PROTEIN ID / SEQUENCE', placeholder: 'e.g. P04637', required: true },
    ],
    status: 'coming-soon', chainTo: ['pymol'],
  },
  {
    id: 'human-protein-atlas-database', name: 'Human Protein Atlas', category: 'protein', icon: 'image_search',
    tagline: 'Tissue and subcellular localization of human proteins via IHC imaging',
    inputLabel: 'Gene/protein name', outputLabel: 'IHC image links, tissue-specific protein levels',
    inputs: [
      { id: 'gene', label: 'GENE / PROTEIN NAME', placeholder: 'e.g. TP53', required: true },
    ],
    status: 'coming-soon', chainTo: ['gtex-database'],
  },
  {
    id: 'pymol', name: 'PyMOL Visualizer', category: 'protein', icon: 'view_in_ar',
    tagline: '3D protein structure visualization, superposition, and image rendering',
    inputLabel: 'PDB/CIF coordinates + PyMOL script', outputLabel: 'Rendered images, structural measurements',
    inputs: [
      { id: 'pdb_id', label: 'PDB ID', placeholder: 'e.g. 2OCJ', required: true },
      { id: 'selection', label: 'SELECTION (optional)', placeholder: 'chain A or resi 100-200' },
    ],
    status: 'coming-soon', chainTo: [],
  },

  // ── SYSTEMS BIOLOGY ────────────────────────────────────────────────────────
  {
    id: 'reactome-database', name: 'Reactome Pathways', category: 'systems', icon: 'account_tree',
    tagline: 'Biological pathway analysis, gene set enrichment, and pathway diagram export',
    inputLabel: 'Gene/protein list or pathway ID', outputLabel: 'Enriched pathways, p-values, diagrams',
    inputs: [
      { id: 'genes', label: 'GENE LIST', placeholder: 'TP53, BRCA1, MDM2 (comma-separated)', required: true },
      { id: 'species', label: 'SPECIES', placeholder: 'Homo sapiens', type: 'select', options: ['Homo sapiens', 'Mus musculus', 'Rattus norvegicus'] },
    ],
    status: 'coming-soon', chainTo: ['string-database'],
  },
  {
    id: 'string-database', name: 'STRING Database', category: 'systems', icon: 'hub',
    tagline: 'Protein-protein interaction networks from experimental and text-mining data',
    inputLabel: 'Protein list', outputLabel: 'Interaction pairs, confidence scores, enrichments',
    inputs: [
      { id: 'proteins', label: 'PROTEIN LIST', placeholder: 'TP53, MDM2, CDKN1A (comma-separated)', required: true },
      { id: 'confidence', label: 'MIN CONFIDENCE', placeholder: '0.7', type: 'select', options: ['0.4', '0.7', '0.9'] },
    ],
    status: 'coming-soon', chainTo: ['reactome-database'],
  },
  {
    id: 'quickgo-database', name: 'QuickGO (Gene Ontology)', category: 'systems', icon: 'list_alt',
    tagline: 'GO term search: Biological Process, Molecular Function, Cellular Component',
    inputLabel: 'Gene ID or GO term', outputLabel: 'GO annotations, GO hierarchy, taxonomic constraints',
    inputs: [
      { id: 'gene_id', label: 'GENE ID / GO TERM', placeholder: 'e.g. TP53 or GO:0006915', required: true },
    ],
    status: 'coming-soon', chainTo: [],
  },

  // ── CLINICAL ───────────────────────────────────────────────────────────────
  {
    id: 'pubchem-database', name: 'PubChem Database', category: 'clinical', icon: 'science',
    tagline: 'Chemical compounds: structure, physicochemical properties, and bioactivity',
    inputLabel: 'Compound name, CID, or SMILES', outputLabel: 'Chemical properties, 2D/3D structure, bioactivity',
    inputs: [
      { id: 'compound', label: 'COMPOUND / CID / SMILES', placeholder: 'e.g. Ibuprofen or 3672', required: true },
    ],
    status: 'coming-soon', chainTo: ['chembl-database', 'opentargets-database'],
  },
  {
    id: 'chembl-database', name: 'ChEMBL Database', category: 'clinical', icon: 'medication',
    tagline: 'Bioactive molecule binding affinity data (IC50, Ki, EC50) against drug targets',
    inputLabel: 'Compound or target protein', outputLabel: 'Binding affinity values, assay details',
    inputs: [
      { id: 'query', label: 'COMPOUND / TARGET', placeholder: 'e.g. Ibuprofen or CHEMBL3301', required: true },
    ],
    status: 'coming-soon', chainTo: ['opentargets-database'],
  },
  {
    id: 'opentargets-database', name: 'Open Targets', category: 'clinical', icon: 'my_location',
    tagline: 'Target-disease associations, drug tractability, and safety scoring',
    inputLabel: 'Target gene or disease name', outputLabel: 'Association scores, tractability, drug candidates',
    inputs: [
      { id: 'query', label: 'TARGET / DISEASE', placeholder: 'e.g. TP53 or colorectal cancer', required: true },
    ],
    status: 'coming-soon', chainTo: ['clinvar-database', 'clinical-trials-database'],
  },
  {
    id: 'clinvar-database', name: 'ClinVar Database', category: 'clinical', icon: 'clinical_notes',
    tagline: 'Clinical significance and pathogenicity of human genetic variants',
    inputLabel: 'Variant (HGVS or gene + variant)', outputLabel: 'Pathogenicity status (PATHOGENIC/VUS/BENIGN)',
    inputs: [
      { id: 'gene', label: 'GENE', placeholder: 'e.g. TP53', required: true },
      { id: 'variant', label: 'VARIANT', placeholder: 'e.g. R175H', required: true },
    ],
    status: 'beta', chainTo: ['gnomad-database'],
  },
  {
    id: 'clinical-trials-database', name: 'Clinical Trials', category: 'clinical', icon: 'lab_profile',
    tagline: 'ClinicalTrials.gov: ongoing and completed trials, eligibility criteria, results',
    inputLabel: 'Disease, drug, or NCT ID', outputLabel: 'Trial phases, eligibility, sponsors, outcomes',
    inputs: [
      { id: 'query', label: 'DISEASE / DRUG / NCT ID', placeholder: 'e.g. TP53 OR NCT01234567', required: true },
      { id: 'phase', label: 'PHASE FILTER', placeholder: 'All', type: 'select', options: ['All', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'] },
    ],
    status: 'coming-soon', chainTo: ['openfda-database'],
  },
  {
    id: 'openfda-database', name: 'OpenFDA Database', category: 'clinical', icon: 'verified',
    tagline: 'FDA official data: adverse events, recalls, drug labels, and approvals',
    inputLabel: 'Drug name or NDC', outputLabel: 'Adverse event reports, warnings, approval data',
    inputs: [
      { id: 'drug', label: 'DRUG NAME / NDC', placeholder: 'e.g. Ibuprofen', required: true },
    ],
    status: 'coming-soon', chainTo: [],
  },

  // ── LITERATURE ─────────────────────────────────────────────────────────────
  {
    id: 'pubmed-database', name: 'PubMed Database', category: 'literature', icon: 'menu_book',
    tagline: 'Primary biomedical literature database (MEDLINE + PMC full-text)',
    inputLabel: 'Search terms, MeSH, authors, PMID', outputLabel: 'Abstracts, article metadata, PMC full-texts',
    inputs: [
      { id: 'query', label: 'QUERY', placeholder: 'e.g. TP53 mutation apoptosis [tiab]', required: true },
      { id: 'max_results', label: 'MAX RESULTS', placeholder: '10', type: 'select', options: ['5', '10', '15', '20'] },
    ],
    status: 'active', chainTo: ['literature-search-europepmc'],
  },
  {
    id: 'literature-search-europepmc', name: 'Europe PMC', category: 'literature', icon: 'article',
    tagline: 'Open-access full-text articles and citation networks (XML/plain text for analysis)',
    inputLabel: 'Search terms or PMCID', outputLabel: 'Full texts, citation lists',
    inputs: [
      { id: 'query', label: 'QUERY', placeholder: 'e.g. TP53 AND cancer', required: true },
    ],
    status: 'coming-soon', chainTo: ['literature-search-openalex'],
  },
  {
    id: 'literature-search-openalex', name: 'OpenAlex', category: 'literature', icon: 'public',
    tagline: 'Global academic citation network — h-index, institutions, DOI lookup',
    inputLabel: 'Keywords, DOI, or author name', outputLabel: 'Bibliometric data, h-index, citation count',
    inputs: [
      { id: 'query', label: 'QUERY / DOI', placeholder: 'e.g. 10.1038/nature12373', required: true },
    ],
    status: 'coming-soon', chainTo: [],
  },
  {
    id: 'literature-search-arxiv', name: 'arXiv Search', category: 'literature', icon: 'school',
    tagline: 'Physics, math, CS, and quantitative biology preprints',
    inputLabel: 'Search terms or arXiv ID', outputLabel: 'Abstracts, PDF download links',
    inputs: [
      { id: 'query', label: 'QUERY / ARXIV ID', placeholder: 'e.g. CRISPR base editing efficiency', required: true },
    ],
    status: 'coming-soon', chainTo: [],
  },
  {
    id: 'literature-search-biorxiv', name: 'bioRxiv / medRxiv', category: 'literature', icon: 'lab_profile',
    tagline: 'Latest life science and medical preprints (before peer review)',
    inputLabel: 'Period, category, or DOI', outputLabel: 'Preprint metadata, PDF links',
    inputs: [
      { id: 'query', label: 'QUERY / DOI', placeholder: 'e.g. Cas9 off-target effects', required: true },
    ],
    status: 'coming-soon', chainTo: ['pubmed-database'],
  },

  // ── UTILITY ────────────────────────────────────────────────────────────────
  {
    id: 'embl-ebi-ols', name: 'Ontology Lookup (OLS)', category: 'utility', icon: 'dictionary',
    tagline: 'Ontology term lookup: diseases (DOID), phenotypes (HP), GO terms and hierarchies',
    inputLabel: 'Term name or ontology ID', outputLabel: 'Ontology terms, hierarchy, cross-references',
    inputs: [
      { id: 'term', label: 'TERM / ID', placeholder: 'e.g. colorectal cancer or HP:0000001', required: true },
      { id: 'ontology', label: 'ONTOLOGY', placeholder: 'All', type: 'select', options: ['All', 'DOID', 'HP', 'GO', 'CHEBI'] },
    ],
    status: 'coming-soon', chainTo: [],
  },
  {
    id: 'workflow-skill-creator', name: 'Workflow Skill Creator', category: 'utility', icon: 'build',
    tagline: 'Convert a successful research workflow into a reusable, shareable agent skill',
    inputLabel: 'Workflow description or session ID', outputLabel: 'New skill definition (SKILL.md)',
    inputs: [
      { id: 'description', label: 'WORKFLOW DESCRIPTION', placeholder: 'Describe the workflow to save as a skill...' },
    ],
    status: 'coming-soon', chainTo: [],
  },
]

export const INSTRUMENTS_BY_CATEGORY = INSTRUMENTS.reduce<Record<InstrumentCategory, Instrument[]>>(
  (acc, inst) => {
    if (!acc[inst.category]) acc[inst.category] = []
    acc[inst.category].push(inst)
    return acc
  },
  {} as Record<InstrumentCategory, Instrument[]>
)

export function getInstrument(id: string): Instrument | undefined {
  return INSTRUMENTS.find(i => i.id === id)
}
