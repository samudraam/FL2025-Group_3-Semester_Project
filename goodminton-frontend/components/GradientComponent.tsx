import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientComponentProps {
    children?: React.ReactNode;
}

const GradientComponent: React.FC<GradientComponentProps> = ({ children }) => (
    <LinearGradient
    colors={['#F8C46B', '#3CBF6D', '#025C24']}
    start={{x: 1.00, y: 0.70}}
    end={{x: 0.00, y: 0.70}}
    locations={[0, 0.35, 1]}
    style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 24 }}
    >
      {children}
    </LinearGradient>
  );
  
  export default GradientComponent;