import unittest

from extract_pas import record


class AdmissionExtractionTests(unittest.TestCase):
    def test_shared_degrees_preserve_all_qualifications(self):
        result = record("Filosofia (Bacharelado/Licenciatura)", "Darcy Ribeiro", "Diurno", "-100.426", "20.000", 8)
        self.assertEqual(result["graus"], ["Bacharelado", "Licenciatura"])
        self.assertEqual(result["minimo"], "-100.426")

    def test_psychology_preserves_professional_qualification(self):
        result = record("Psicologia (Bacharelado/Licenciatura/ Psicólogo)", "Darcy Ribeiro", "Diurno", "92.692", "160.000", 9)
        self.assertEqual(result["graus"], ["Bacharelado", "Licenciatura", "Psicólogo"])

    def test_missing_qualification_is_not_assumed_to_be_bachelor(self):
        result = record("Educação Física Ciclo Básico", "Darcy Ribeiro", "Diurno", "1.000", "20.000", 8)
        self.assertEqual(result["graus"], [])

    def test_single_qualification_does_not_include_licenciatura(self):
        result = record("Artes Visuais (Bacharelado)*", "Darcy Ribeiro", "Diurno", "1.000", "20.000", 7)
        self.assertEqual(result["graus"], ["Bacharelado"])


if __name__ == "__main__":
    unittest.main()
