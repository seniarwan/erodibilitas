//Digunakan untuk kebutuhan praktek matakuliah "Konservasi Tanah dan Air" tahun 2023
//Departemen Ilmu Tanah, Fakultas Pertanian Unhas
//Formula K = X * [2.1 * 1e-4 * Math.pow(M, 1.14) * (12 - OM) + 3.25 * (SC - 2) + 2.5 * (PC - 3)] / 100
//Kunjungi https://soilgrids.org/

/////////// HARUS DIISI!  ////////////////////////
var clay = 19; //Pilih PHYSICAL SOIL > Clay content; silahkan klik secara acak pada wilayah Sulawesi Selatan; isi nilai yg diperoleh
var sand = 50; //Pilih PHYSICAL SOIL > Sand content; silahkan klik pada lokasi yg sama sebelumnya; isi nilai yg diperoleh
var cfvo = 125; //Pilih PHYSICAL SOIL > Coarse fragments; silahkan klik pada lokasi yg sama sebelumnya; isi nilai yg diperoleh
var bulk_density = 50; //Pilih PHYSICAL SOIL > Bulk density; silahkan klik pada lokasi yg sama sebelumnya; isi nilai yg diperoleh
var SOC = 637; //Pilih CHEMICAL SOIL > SOC; silahkan klik pada lokasi yg sama sebelumnya; isi nilai yg diperoleh
var Ksat = 1500; //Saturated Hydraulic Conductivity (Ksat) (cm/d)
var hydrologic_group = 2; //Hydrologic Soil Groups (HSG);

/////////// JANGAN DIUBAH!  ////////////////////////
var clay = clay / 10;
var sand = sand / 10;
var silt = 100 - (sand + clay);

var veryfinesand = 0.2 * sand; //
var M = (veryfinesand + silt) * (100 - clay);
var OM = (SOC / 100) * 1.72;
var maxOM = 6; // Batas maksimum untuk OM
OM = Math.min(OM, maxOM); // Memastikan OM tidak lebih dari maxOM
OM = Math.max(OM, 0); // Memastikan OM tidak kurang dari 0
var BD = bulk_density / 100;
print("Clay (%):", clay);
print("Sand (%):", sand);
print("Silt (%):", silt);
print("Organic Matter (%):", ee.Number(OM).format('%.2f'));

// Packing density equation and texture classes taken from: R.J. Jones, G. Spoor, A. Thomasson
// Vulnerability of subsoils in Europe to compaction: a preliminary analysis,
// Exp. Impact Prev. Subsoil Compact. Eur. Union, 73 (2003), pp. 131-143
var pack_density = BD + clay * 0.009;
var texture_class = clay < 18 && sand > 65 ? 1 :
    (clay < 35 && sand > 15) || (clay > 18 && sand > 65) ? 2 :
    (clay < 35 && sand < 15) ? 3 :
    (clay >= 35 && clay <= 60) ? 4 :
    (clay > 60) ? 5 : 0;

// Adding an organic texture class based on an Organic Matter content is 20%, and clay content is 0%,
// or when Organic Matter content is 30%, and clay content is 50%. The values in between are linearly interpolated.
// Organic soil definition taken from: Huang, P. T., Patel, M., Santagata, M. C., & Bobet, A. (2009).
// Classification of organic soils.    
var OM_test = OM >= 20 ? 30 : (OM / 50) * 20;

// Kondisi untuk menambahkan kelas Organik (9) berdasarkan nilai OM
if (texture_class === 0 && OM >= OM_test) {
    texture_class = 9;
}

// Texture and packing density used as proxy for the calculation of the soil structure class, as done in
// Panagos, P., Meusburger, K., Ballabio, C., Borrelli, P., & Alewell, C. (2014).
// Soil erodibility in Europe: A high-resolution dataset based on LUCAS.
// Science of the total environment, 479, 189-200.

var structure_class = 0; // Default: Tidak ada kelas struktur

if (texture_class === 1) {
    if (pack_density < 1.40) {
        structure_class = 4;
    } else if (pack_density >= 1.40 && pack_density <= 1.75) {
        structure_class = 3;
    } else {
        structure_class = 2;
    }
} else if (texture_class === 2) {
    if (pack_density < 1.40) {
        structure_class = 3;
    } else if (pack_density >= 1.40 && pack_density <= 1.75) {
        structure_class = 2;
    } else {
        structure_class = 2;
    }
} else if (texture_class === 3) {
    if (pack_density < 1.40) {
        structure_class = 2;
    } else if (pack_density >= 1.40 && pack_density <= 1.75) {
        structure_class = 2;
    } else {
        structure_class = 1;
    } 
} else if (texture_class === 4) {
    if (pack_density < 1.40) {
        structure_class = 2;
    } else if (pack_density >= 1.40 && pack_density <= 1.75) {
        structure_class = 1;
    } else {
        structure_class = 1;
    }
} else if (texture_class === 5 || texture_class === 9) {
    if (pack_density < 1.40) {
        structure_class = 2;
    } else if (pack_density >= 1.40 && pack_density <= 1.75) {
        structure_class = 1;
    } else {
        structure_class = 1;
    }
}
print("Soil Structure Class:", structure_class);

var cfvo = cfvo / 10; // Convert to cm3/100cm3 (vol%)
print("Coarse fragment (vol%):", ee.Number(cfvo).format('%.2f'));
cfvo = cfvo / 10000; // Convert from per10000 to [0,1] range
var Ksat = Ksat / 1e4; // 10 000 scaling factor applied to the ksat dataset
print("Saturated Hydraulic Conductivity (Ksat):", ee.Number(Ksat).format('%.2f'));
Ksat = Ksat * (1 - cfvo);
// Mapping Global Hydrologic Soil Groups to their permeability class equivalents,
// from high run-off potential (=~ low permeability), to low run-off potential (=~ high permeability).
// Taken from: USDA (1983) National Soil Survey Handbook. No. 430, US Department of Agriculture, USDA, Washington DC

var permeability_class = 1; // Default: Fast and very fast

if (Ksat <= 146.304) {
    if (Ksat > 48.768 && (hydrologic_group === 1 || hydrologic_group === 14)) {
        permeability_class = 2; // Moderate fast
    } else if (Ksat > 12.192 && (hydrologic_group === 2 || hydrologic_group === 24)) {
        permeability_class = 3; // Moderate
    } else if (Ksat > 4.8768 && hydrologic_group === 3) {
        permeability_class = 4; // Moderate low
    } else if (Ksat > 2.4384 && hydrologic_group === 34) {
        permeability_class = 5; // Slow
    } else if (Ksat <= 2.4384 && hydrologic_group === 4) {
        permeability_class = 6; // Very Slow
    }
}
print("Soil Permeability Class:", permeability_class);

// Hitung K
var K = 2.1 * 1e-4 * Math.pow(M, 1.14) * (12 - OM) +
        3.25 * (structure_class - 2) +
        2.5 * (permeability_class - 3);
var constanta = 1.292; //Arsyad (2010) = 1.292; Renard et al (1997) = 0.1317
K = (K * constanta) / 100;

print("K factor:", ee.Number(K).format('%.2f'));
