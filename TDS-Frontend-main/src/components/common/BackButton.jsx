import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function BackButton({ to, label = 'Back', className = '' }) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (to) {
            navigate(to);
        } else {
            navigate(-1);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`inline-flex items-center text-gray-700 hover:text-[#F68B1F] transition-colors ${className}`}
        >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            {label}
        </button>
    );
}

export default BackButton; 