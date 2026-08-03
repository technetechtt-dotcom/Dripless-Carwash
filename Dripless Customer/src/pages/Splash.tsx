import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  LeafIcon,
  CarIcon,
  DropletIcon,
  BarChart3Icon,
  SparklesIcon,
  SunIcon,
  TreesIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const onboardingSlides = [
{
  title: 'Welcome to Dripless Wash',
  description: 'Waterless Car Care. Clean Homes. Clean Planet.',
  gradient: 'from-eco-500 via-teal-500 to-cyan-600',
  bgAccent: 'bg-teal-400/20',
  icon: LeafIcon,
  secondaryIcon: SparklesIcon
},
{
  title: 'Eco-Friendly Services',
  description:
  "From waterless car washes to green taxi rides, we're committed to sustainability.",
  gradient: 'from-teal-600 via-emerald-500 to-green-500',
  bgAccent: 'bg-emerald-400/20',
  icon: CarIcon,
  secondaryIcon: DropletIcon
},
{
  title: 'Track Your Impact',
  description:
  'See how much CO₂, water, and plastic you save with every service.',
  gradient: 'from-cyan-600 via-blue-500 to-indigo-500',
  bgAccent: 'bg-blue-400/20',
  icon: BarChart3Icon,
  secondaryIcon: TreesIcon
}];

const Splash = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);
  const goToNextSlide = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/signup');
    }
  };
  if (showSplash) {
    return (
      <motion.div
        initial={{
          opacity: 0
        }}
        animate={{
          opacity: 1
        }}
        exit={{
          opacity: 0
        }}
        className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-eco-50 to-teal-100 relative overflow-hidden">

        {/* Animated background blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-eco-400/20 rounded-full blur-3xl" />

        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            delay: 1
          }}
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl" />


        <div className="text-center relative z-10">
          <motion.div
            initial={{
              scale: 0.5,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20
            }}
            className="flex items-center justify-center mb-6">

            <div className="bg-gradient-to-tr from-eco-500 to-teal-600 p-5 rounded-3xl shadow-xl shadow-eco-500/30">
              <LeafIcon size={48} className="text-white" />
            </div>
          </motion.div>
          <motion.h1
            initial={{
              y: 20,
              opacity: 0
            }}
            animate={{
              y: 0,
              opacity: 1
            }}
            transition={{
              delay: 0.3
            }}
            className="text-5xl font-bold text-slate-800 mb-3 tracking-tight">

            Dripless
          </motion.h1>
          <motion.p
            initial={{
              y: 20,
              opacity: 0
            }}
            animate={{
              y: 0,
              opacity: 1
            }}
            transition={{
              delay: 0.5
            }}
            className="text-eco-600 font-medium text-lg">

            Waterless Car Care, Done Right
          </motion.p>
        </div>
      </motion.div>);

  }
  const slide = onboardingSlides[currentSlide];
  const SlideIcon = slide.icon;
  const SecondaryIcon = slide.secondaryIcon;
  return (
    <div className="h-screen w-full flex flex-col bg-white">
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{
              opacity: 0,
              scale: 1.05
            }}
            animate={{
              opacity: 1,
              scale: 1
            }}
            exit={{
              opacity: 0
            }}
            transition={{
              duration: 0.5
            }}
            className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}>

            {/* Decorative elements */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.15, 0.25, 0.15]
              }}
              transition={{
                duration: 6,
                repeat: Infinity
              }}
              className="absolute top-16 right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                delay: 1.5
              }}
              className="absolute top-1/3 -left-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

            <motion.div
              animate={{
                y: [0, -8, 0],
                rotate: [0, 5, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute bottom-1/3 right-6 w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20" />


            {/* Large centered icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{
                  scale: 0.8,
                  opacity: 0
                }}
                animate={{
                  scale: 1,
                  opacity: 1
                }}
                exit={{
                  scale: 0.8,
                  opacity: 0
                }}
                transition={{
                  delay: 0.15,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20
                }}
                className="relative">

                <div className="bg-white/15 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-2xl">
                  <SlideIcon
                    size={72}
                    className="text-white"
                    strokeWidth={1.5} />

                </div>
                <motion.div
                  animate={{
                    y: [0, -6, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="absolute -top-4 -right-4 bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/20">

                  <SecondaryIcon size={24} className="text-white" />
                </motion.div>
              </motion.div>
            </div>

            {/* Bottom gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{
                  opacity: 0,
                  x: 20
                }}
                animate={{
                  opacity: 1,
                  x: 0
                }}
                exit={{
                  opacity: 0,
                  x: -20
                }}
                transition={{
                  duration: 0.3
                }}>

                <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                  {slide.title}
                </h2>
                <p className="text-white/80 text-lg leading-relaxed">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {onboardingSlides.map((_, index) =>
              <motion.div
                key={index}
                animate={{
                  width: index === currentSlide ? 32 : 8,
                  backgroundColor:
                  index === currentSlide ?
                  '#ffffff' :
                  'rgba(255,255,255,0.3)'
                }}
                className="h-2 rounded-full" />

              )}
            </div>
            <motion.button
              whileTap={{
                scale: 0.9
              }}
              onClick={goToNextSlide}
              className="bg-white text-slate-900 rounded-full p-4 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">

              {currentSlide === onboardingSlides.length - 1 ?
              <span className="font-bold px-4">Get Started</span> :

              <ChevronRightIcon size={24} />
              }
            </motion.button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 text-slate-500 font-medium transition-colors">

          Already have an account?{' '}
          <span className="text-eco-600 font-bold">Log In</span>
        </button>
      </div>
    </div>);

};
export default Splash;