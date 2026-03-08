export const Loading = () => {
  return (
    <div className='h-screen flex flex-col items-center justify-center bg-black text-white font-mono uppercase tracking-widest gap-4'>
      <div className='animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full'></div>
      <div>Initialising Game Assets...</div>
    </div>
  )
}
