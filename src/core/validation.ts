/**
 * Remplace les messages de validation natifs (dans la langue du navigateur, souvent en anglais)
 * par des messages en français.
 */
export function localizeValidation(form: HTMLFormElement): void {
  const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select');

  fields.forEach(field => {
    field.addEventListener('invalid', () => {
      /* Un message personnalisé déjà posé par la vue (ex : montant invalide) est conservé */
      if (field.validity.customError) return;
      field.setCustomValidity(frenchMessage(field));
    });

    const reset = () => field.setCustomValidity('');
    field.addEventListener('input', reset);
    field.addEventListener('change', reset);
  });
}

function frenchMessage(field: HTMLInputElement | HTMLSelectElement): string {
  const { validity } = field;
  if (validity.valueMissing) {
    return field instanceof HTMLSelectElement ? 'Veuillez sélectionner un élément de la liste.' : 'Veuillez remplir ce champ.';
  }
  if (validity.typeMismatch && field.type === 'email') return 'Veuillez saisir une adresse email valide.';
  if (validity.tooLong) return `Ce champ ne doit pas dépasser ${(field as HTMLInputElement).maxLength} caractères.`;
  if (validity.badInput) return 'Veuillez saisir une valeur valide.';
  return 'Valeur invalide.';
}
