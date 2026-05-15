import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import StorageIcon from '@mui/icons-material/Storage';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TableChartIcon from '@mui/icons-material/TableChart';

const drawerWidth = 240;

const nav = [
  { to: '/connections', label: 'Conexões', icon: <HubIcon /> },
  { to: '/query', label: 'Query explorer', icon: <TableChartIcon /> },
  { to: '/data-sources', label: 'Data sources', icon: <StorageIcon /> },
  { to: '/dashboards', label: 'Dashboards', icon: <DashboardIcon /> },
  { to: '/ai', label: 'IA & prompts', icon: <AutoAwesomeIcon /> },
];

export default function Layout({ children }) {
  const loc = useLocation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
            Mitralab Proto
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, opacity: 0.85 }}>
            ingestão · consultas · dashboards com IA
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          {nav.map((item) => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={loc.pathname === item.to}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: `calc(100% - ${drawerWidth}px)` }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
