import { motion } from 'framer-motion';

interface Props {
  isSpeaking?: boolean;
  name?: string;
}

export default function DJAvatar({ isSpeaking, name = 'MiMo DJ' }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-radio-500 to-primary-500 flex items-center justify-center">
          <span className="text-3xl">🎙️</span>
        </div>
        {isSpeaking && (
          <>
            <motion.div
              animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-full border-2 border-radio-500"
            />
            <motion.div
              animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
              className="absolute inset-0 rounded-full border-2 border-radio-400"
            />
          </>
        )}
      </motion.div>
      <div className="text-center">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-gray-500">{isSpeaking ? 'Speaking...' : 'Your AI DJ'}</p>
      </div>
    </div>
  );
}
