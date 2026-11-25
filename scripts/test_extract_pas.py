import unittest

from extract_pas import quota_modalities, quota_scores, record


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


class QuotaExtractionTests(unittest.TestCase):
    def test_quota_columns_preserve_order_negative_and_absence(self):
        values=["-10.500", "20.000"]+["-", "-"]*7+["1.234", "30.000"]
        result=quota_scores(values)
        self.assertEqual(result["ep_baixa_ppi"]["minimo"], "-10.500")
        self.assertIsNone(result["ep_baixa_pcd_ppi"]["minimo"])
        self.assertEqual(result["negros"]["minimo"], "1.234")

    def test_rejects_missing_columns_and_inverted_values(self):
        with self.assertRaises(ValueError): quota_scores(["-"]*17)
        with self.assertRaises(ValueError): quota_scores(["20.000", "1.000"]+["-"]*16)

    def test_modalities_keep_rules_from_each_cycle(self):
        latest=quota_modalities("2023-2025")
        previous=quota_modalities("2022-2024")
        self.assertIn("1,0",latest[0]["descricao"])
        self.assertIn("PPIQ",latest[0]["descricao"])
        self.assertIn("1,5",previous[0]["descricao"])
        self.assertNotIn("PPIQ",previous[0]["descricao"])


if __name__ == "__main__":
    unittest.main()
