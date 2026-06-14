import Swal, { type SweetAlertIcon } from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2400,
  timerProgressBar: true,
})

export function showToast(title: string, icon: SweetAlertIcon = 'success') {
  void Toast.fire({
    icon,
    title,
  })
}

export async function confirmDanger({
  title,
  text,
  confirmButtonText = 'Confirmar',
}: {
  title: string
  text: string
  confirmButtonText?: string
}) {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  })

  return result.isConfirmed
}
