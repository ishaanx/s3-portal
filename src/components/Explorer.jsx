import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { Link as ReactRouterLink, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  VStack,
  Heading,
  Text,
  Link,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Icon,
  useColorModeValue,
  Flex,
} from "@chakra-ui/react";
import { GrHome, GrFolder, GrDocument, GrFormNext } from "react-icons/gr";
import { useContents } from "../hooks/useContents";
import { sanitizePrefix, formatFileSize } from "../helpers";

export default function Explorer() {
  const [searchParams] = useSearchParams();
  const prefix = sanitizePrefix(searchParams.get("prefix") || "");

  useEffect(() => {
    document.title = process.env.BUCKET_NAME;
  }, []);

  return (
    <Flex direction="column" minH="100vh" width="100%" p={5}>
      <Box flex="1" width="100%">
        <VStack alignItems="flex-start" spacing={5} width="100%">
          <Navigation prefix={prefix} />
          <Listing prefix={prefix} />
        </VStack>
      </Box>
    </Flex>
  );
}

function Navigation({ prefix }) {
  const folders = prefix
    .split("/")
    .slice(0, -1)
    .map((item, index, items) => ({
      name: `${item}/`,
      url: `/?prefix=${items.slice(0, index + 1).join("/")}/`,
      isCurrent: index === items.length - 1,
    }));

  const breadcrumbBg = useColorModeValue("gray.100", "gray.700");

  return (
    <Breadcrumb
      borderWidth="1px"
      borderRadius="md"
      shadow="sm"
      p={3}
      bg={breadcrumbBg}
      spacing={1}
      separator={<Icon as={GrFormNext} />}
      width="100%"
    >
      <BreadcrumbItem key="root" isCurrentPage={folders.length === 0}>
        {folders.length === 0 ? (
          <Text color="gray.500">
            <Icon as={GrHome} mr={2} />
            {process.env.BUCKET_NAME}
          </Text>
        ) : (
          <BreadcrumbLink as={ReactRouterLink} to="/" aria-label="bucket root">
            <Icon as={GrHome} />
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
      {folders.map((item) => (
        <BreadcrumbItem key={item.url} isCurrentPage={item.isCurrent}>
          {item.isCurrent ? (
            <Text color="gray.500">{item.name}</Text>
          ) : (
            <BreadcrumbLink as={ReactRouterLink} to={item.url}>
              {item.name}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}

Navigation.propTypes = {
  prefix: PropTypes.string.isRequired,
};

function Listing({ prefix }) {
  const { status, data, error } = useContents(prefix);
  const tableBg = useColorModeValue("white", "gray.800");
  
  // Function to handle file download
  const handleDownload = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', true); // Set the download attribute
    link.click(); // Programmatically click the link to trigger the download
  };

  return (
    <>
      <Heading as="h3" size="lg" mt={2} mb={2} fontWeight="semibold">
        {prefix ? `${prefix.split("/").slice(-2, -1)}/` : process.env.BUCKET_NAME}
      </Heading>
      <Box borderWidth="1px" borderRadius="md" shadow="sm" bg={tableBg} width="100%">
        <Table variant="simple" size="md">
          <Thead bg={useColorModeValue("gray.200", "gray.700")}>
            <Tr>
              <Th>Name</Th>
              <Th>Last modified</Th>
              <Th isNumeric>Size</Th>
              <Th>Actions</Th> {/* New column header for actions */}
            </Tr>
          </Thead>
          <Tbody>
            {(() => {
              switch (status) {
                case "loading":
                  return (
                    <Tr>
                      <Td colSpan={4} textAlign="center">
                        <Spinner size="md" emptyColor="gray.200" mr={1} />
                        Loading...
                      </Td>
                    </Tr>
                  );
                case "error":
                  return (
                    <Tr>
                      <Td colSpan={4} textAlign="center" color="red.500">
                        Failed to fetch data: {error.message}
                      </Td>
                    </Tr>
                  );
                case "success":
                  return (
                    <>
                      {data?.folders.map((item) => (
                        <Tr key={item.path}>
                          <Td>
                            <Icon as={GrFolder} mr={2} />
                            <Link as={ReactRouterLink} to={item.url}>
                              {item.name}
                            </Link>
                          </Td>
                          <Td>–</Td>
                          <Td isNumeric>–</Td>
                          <Td></Td> {/* Empty cell for folders */}
                        </Tr>
                      ))}
                      {data?.objects.map((item) => (
                        <Tr key={item.path}>
                          <Td>
                            <Icon as={GrDocument} mr={2} />
                            <Link href={item.url} isExternal>
                              {item.name}
                            </Link>
                          </Td>
                          <Td>{item.lastModified.toLocaleString()}</Td>
                          <Td isNumeric>{formatFileSize(item.size)}</Td>
                          <Td>
                            <Button as={Link} href={item.url} download colorScheme="blue" size="sm">
                              Download
                            </Button>
                          </Td> {/* New cell with download button */}
                        </Tr>
                      ))}
                    </>
                  );
                default:
                  return null;
              }
            })()}
          </Tbody>
        </Table>
      </Box>
    </>
  );
}

Listing.propTypes = {
  prefix: PropTypes.string.isRequired,
};
