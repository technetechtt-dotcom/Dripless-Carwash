import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
type ServiceCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route: string;
};
const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  description,
  icon,
  color,
  route
}) => {
  const navigate = useNavigate();
  return (
    <motion.div
      whileHover={{
        scale: 1.02
      }}
      whileTap={{
        scale: 0.98
      }}
      className="glass-card p-4 flex flex-col items-start cursor-pointer group dark:bg-slate-800/60"
      onClick={() => navigate(route)}>

      <div
        className={`${color} p-3.5 rounded-xl mb-3 shadow-md group-hover:scale-110 transition-transform duration-300`}>

        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
          {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {description}
        </p>
      </div>
    </motion.div>);

};
export default ServiceCard;