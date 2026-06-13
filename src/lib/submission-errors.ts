/**
 * Error messages for the submission forms. We surface codes in the URL
 * and map them to human Spanish here so the user sees something useful.
 */
const SUBMISSION_ERRORS: Record<string, string> = {
  invalid_title: 'Revisá el título (entre 4 y 120 caracteres).',
  invalid_company: 'Indicá el nombre de la empresa.',
  invalid_description: 'La descripción tiene que tener entre 20 y 2000 caracteres.',
  invalid_requirements: 'Agregá al menos un requisito (separado por comas).',
  invalid_modality: 'Elegí una modalidad (remoto, híbrido o presencial).',
  invalid_category: 'Elegí una categoría.',
  invalid_salary: 'El salario tiene que ser un número entero.',
  invalid_salary_range: 'El salario mínimo no puede ser mayor que el máximo.',
  invalid_contact: 'Indicá un email o link de contacto válido.',
  invalid_location: 'La ubicación es demasiado larga.',
  invalid_type: 'Elegí un tipo de recurso.',
  invalid_url: 'El URL no es válido.',
  invalid_added_by: 'Indicá tu nombre o el de quien agrega el recurso.',
  invalid_author: 'Indicá el nombre del autor del proyecto.',
  invalid_author_github: 'El usuario de GitHub es demasiado largo.',
  invalid_repo: 'El link al repo no es válido.',
  invalid_demo: 'El link a la demo no es válido.',
  invalid_technologies: 'Agregá al menos una tecnología (separada por comas).',
  invalid_event_type: 'Elegí un tipo de evento.',
  invalid_event_category: 'Elegí una categoría de evento.',
  invalid_start_date: 'La fecha de inicio no es válida.',
  invalid_end_date: 'La fecha de fin no es válida.',
  invalid_start_time: 'El horario no es válido.',
  invalid_max_participants: 'El número de participantes no es válido.',
  submission_failed: 'No pudimos guardar el envío. Probá de nuevo en unos minutos.',
  invalid_target_type: 'Tipo de contenido inválido.',
  invalid_target_id: 'ID de envío inválido.',
  invalid_action: 'Acción inválida.',
  rejection_reason_required: 'Al rechazar, debés indicar el motivo para que el autor reciba una devolución.',
  update_failed: 'No pudimos aplicar la acción. Probá de nuevo.',
};

export function submissionErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return SUBMISSION_ERRORS[code] ?? 'Ocurrió un error inesperado. Probá de nuevo.';
}
