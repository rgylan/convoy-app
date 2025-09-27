import { toast } from 'react-toastify';

export const handleApiError = (error, fallbackMessage = 'An error occurred') => {
  const message = error.response?.data?.message || error.message || fallbackMessage;
  console.error('API Error:', error);
  return message;
};

export const showErrorToast = (message) => {
  toast.error(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

export const showSuccessToast = (message) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};
